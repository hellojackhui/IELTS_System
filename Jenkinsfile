// CI/CD for the IELTS sync server.
//
// Topology: Jenkins runs on the SAME Aliyun ECS as the Docker service, so a
// push just rebuilds the container in place. No SSH, no registry, no file copy.
//
//   local `git push` -> GitHub webhook -> Jenkins job (this file) ->
//   docker compose up -d --build -> health check
//
// The SQLite DB lives in the named docker volume `ielts-data` (see
// docker-compose.yml), so it survives image rebuilds regardless of the
// Jenkins workspace. Secrets are injected from Jenkins credentials into a
// throwaway .env and removed afterwards — they never enter git.
//
// One-time setup (see the checklist in the chat / docs/ci-jenkins.md):
//   - Jenkins user can run docker (in the `docker` group)
//   - Jenkins credentials (Secret text): ielts-jwt-secret, ielts-ai-api-key
//   - Jenkins credentials (Secret text): expo-token  (expo.dev Access Token,
//     for publishing JS OTA updates to EAS Update)
//   - Pipeline job: "Pipeline script from SCM" -> this repo -> branch main
//     -> Script Path: Jenkinsfile, and tick
//     "GitHub hook trigger for GITScm polling"
//   - GitHub webhook -> http://<ECS_IP>:8080/github-webhook/ (push events)

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()          // never let two deploys race
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    githubPush()                        // fast path: fired by the GitHub webhook
    pollSCM('H/5 * * * *')              // fallback: catch missed webhooks within ~5 min
  }

  environment {
    COMPOSE = 'docker compose'          // v2 syntax; use 'docker-compose' if on v1
    PORT    = '8787'
    // Fixed project name so the container + `ielts-data` volume are the SAME
    // regardless of which directory Jenkins builds in. Set this to match your
    // EXISTING live stack (see `docker compose ls` / `docker volume ls`) so the
    // first Jenkins deploy reuses your current DB instead of creating a blank one.
    COMPOSE_PROJECT_NAME = 'ielts'
  }

  stages {
    stage('Checkout') {
      steps {
        // GitHub connectivity from the ECS is flaky; retry instead of failing
        // the whole build on a transient timeout (pollSCM re-triggers anyway).
        retry(3) {
          checkout scm
        }
      }
    }

    stage('Write .env') {
      steps {
        // Secrets come from Jenkins' credential store, not from git.
        // Single-quoted sh + shell expansion so Jenkins masks them in the log.
        withCredentials([
          string(credentialsId: 'ielts-jwt-secret', variable: 'JWT_SECRET'),
          string(credentialsId: 'ielts-ai-api-key', variable: 'AI_API_KEY')
        ]) {
          sh '''
            umask 077
            cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
AI_BASE_URL=https://aiberm.org/v1
AI_API_KEY=${AI_API_KEY}
AI_MODEL=glm-5.3
EOF
          '''
        }
      }
    }

    stage('Build & deploy') {
      steps {
        // Rebuilds only what changed; the named volume keeps the DB.
        sh '$COMPOSE up -d --build'
      }
    }

    stage('Health check') {
      steps {
        // Jenkins runs in its own container, so its localhost is NOT the host.
        // Probe from INSIDE the server container instead (node has global fetch).
        sh '''
          for i in $(seq 1 30); do
            if $COMPOSE exec -T server node -e 'fetch("http://localhost:8787/health").then(r=>r.ok?r.text():Promise.reject()).then(t=>console.log("health:",t)).catch(()=>process.exit(1))'; then
              echo "deploy OK"; exit 0
            fi
            sleep 2
          done
          echo "health check FAILED — recent server logs:"
          $COMPOSE logs --tail=80 server || true
          exit 1
        '''
      }
    }

    // JS-only OTA update for the mobile app via EAS Update. Devices with the
    // expo-updates-enabled build pull this on next launch; native changes
    // (runtimeVersion bump) still need a manual reinstall.
    stage('OTA update (mobile)') {
      when { changeset 'apps/mobile/**' }
      steps {
        // A missing/expired expo-token must never fail the main deploy.
        catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
          withCredentials([string(credentialsId: 'expo-token', variable: 'EXPO_TOKEN')]) {
            sh '''
              if [ ! -f apps/mobile/.eas/projects.json ]; then
                echo "EAS project not initialized (no .eas/projects.json) — skipping OTA publish."
                exit 0
              fi
              # The Jenkins agent image has no node/npm, but the freshly built
              # server image does — run the export+publish inside it. Fall back
              # to the official node image if the server image is missing.
              #
              # Jenkins itself runs in a container, so docker -v resolves
              # against the HOST filesystem. /proc/mounts only shows the
              # backing device (e.g. /dev/vda3) — ask Docker's own mount
              # records for the real host-side source instead ($HOSTNAME is
              # the Jenkins container ID).
              HOSTJH="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/jenkins_home"}}{{.Source}}{{end}}{{end}}' "$HOSTNAME")"
              [ -n "$HOSTJH" ] || HOSTJH="/var/lib/docker/volumes/jenkins_home/_data"
              echo "host jenkins_home: $HOSTJH"
              HOSTWS="$HOSTJH/workspace/$(basename "$WORKSPACE")"
              echo "host workspace: $HOSTWS"
              OTAMSG="$(git log -1 --pretty=%s)"
              IMG="ielts-server:latest"
              if ! docker image inspect "$IMG" >/dev/null 2>&1; then
                echo "$IMG not found locally — falling back to node:22 pull"
                IMG="node:22"
              fi
              docker run --rm \\
                -v "$HOSTWS":/w -w /w \\
                -e EXPO_TOKEN -e OTAMSG -e EAS_NO_VCS=1 \\
                -e HOME=/tmp -e npm_config_cache=/tmp/.npm \\
                "$IMG" \\
                sh -c 'npm ci --no-audit --no-fund --loglevel=error && cd apps/mobile && npx --yes eas-cli@latest update --branch production --non-interactive --message "$OTAMSG"'
            '''
          }
        }
      }
    }
  }

  post {
    always {
      sh 'rm -f .env || true'           // don't leave secrets on disk
      sh 'docker image prune -f || true' // reclaim dangling layers
    }
    success { echo 'Deployed. http://<ECS_IP>:8787/health should return ok.' }
    failure { echo 'Deploy failed — the container was left as-is; check the log above.' }
  }
}
