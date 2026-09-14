# CI/CD：push 自动部署（Jenkins + Docker，同机）

拓扑：Jenkins 和服务端跑在**同一台阿里云 ECS**。push 后 GitHub 回调 Jenkins，Jenkins 在本机 `docker compose up -d --build` 重建容器。数据库在具名卷 `ielts-data` 里，重建不丢。

```
本地 git push → GitHub → webhook → Jenkins(ECS:8080) → docker compose 重建 → /health 检查
```

流水线本体是仓库根目录的 [`Jenkinsfile`](../Jenkinsfile)。下面是**一次性**配置，做完就一劳永逸。

## 0. ⚠️ 先备份 + 对齐工程名（否则数据"像丢了"）

`docker compose` 用**工程名**（默认=所在目录名）给容器和卷加前缀。你现在手动部署的目录名，和 Jenkins 工作区的目录名不同，直接 `up` 会被当成**两套栈**：Jenkins 建个新容器 + **空的新卷**，你已有的账号数据还在旧卷里没被用上，而且两个容器抢 8787 端口。

所以上线前先做两件事：

**(a) 备份现有 DB**（在 ECS 上，先看清现有卷名）：
```bash
docker volume ls | grep ielts          # 找到现有卷，如 ielts_system_ielts-data
docker run --rm -v <现有卷名>:/data -v $PWD:/backup alpine \
  tar czf /backup/ielts-db.tgz -C /data .
```

**(b) 对齐工程名**，让 Jenkins 复用同一套容器和卷。看现有栈叫什么：
```bash
docker compose ls                       # 看现有 project 名
```
- 如果现有 project 就叫 `ielts` → 不用改，Jenkinsfile 里 `COMPOSE_PROJECT_NAME='ielts'` 正好对上。
- 如果叫别的（如 `ielts_system`）→ 把 Jenkinsfile 里的 `COMPOSE_PROJECT_NAME` 改成那个名字；这样第一次 Jenkins 部署会**接管**现有容器和卷，数据不动。
- 想彻底统一：停掉旧栈（`docker compose down`，**别加 `-v`**，卷会保留），把 DB 从旧卷迁到新工程名的卷（`<新工程名>_ielts-data`）后再让 Jenkins 接管。拿不准就把上面两条命令的输出发我，我给你定。

> 稳妥做法：备份好之后，第一次先在 Jenkins 点「Build Now」，部署完立刻验证 `http://<ECS_IP>:8787/health` 的 `words` 和你的账号还在，再开 webhook 自动触发。

## 1. 让 Jenkins 能用 docker（在 ECS 上）

```bash
sudo usermod -aG docker jenkins      # 把 jenkins 用户加进 docker 组
sudo systemctl restart jenkins
# 验证（切到 jenkins 用户跑）：
sudo -u jenkins docker ps
sudo -u jenkins docker compose version
```

`docker compose`（v2）没有的话，把 Jenkinsfile 里 `COMPOSE = 'docker compose'` 改成 `'docker-compose'`。

## 2. 在 Jenkins 里存密钥（不进仓库）

Manage Jenkins → Credentials → (global) → Add Credentials，**Secret text** 各加一条：

| Kind | ID | Secret |
|---|---|---|
| Secret text | `ielts-jwt-secret` | 你的 JWT_SECRET（一长串随机） |
| Secret text | `ielts-ai-api-key` | 你的 AI 中转 key（sk-...） |

> Jenkinsfile 会用这两条临时生成 `.env`，`docker compose` 读完就删掉。`AI_BASE_URL`/`AI_MODEL` 在 Jenkinsfile 里写死了，要改直接改文件。

## 3. 建 Pipeline 任务

New Item → 名字随意（如 `ielts-server`）→ **Pipeline** → OK，然后：

- **Build Triggers**：勾 **GitHub hook trigger for GITScm polling**
- **Pipeline** → Definition：**Pipeline script from SCM**
  - SCM: Git
  - Repository URL: `git@github.com:hellojackhui/IELTS_System.git`（或 https 形式）
  - Credentials: 若仓库私有，加一条 SSH key 或 GitHub PAT（公开仓库可留空）
  - Branch: `*/main`
  - **Script Path**: `Jenkinsfile`
- Save

> 要装 **GitHub plugin**（提供 `/github-webhook/` 入口和上面那个触发器）。Manage Jenkins → Plugins 里搜 GitHub 装上。

## 4. GitHub 配 webhook

仓库 → Settings → Webhooks → Add webhook：

- **Payload URL**: `http://<你的ECS公网IP>:8080/github-webhook/`（结尾斜杠别漏）
- **Content type**: `application/json`
- **events**: Just the push event
- Add webhook

加完 GitHub 会发一次测试请求，webhook 列表里出现绿色 ✓ 就说明通了。

## 5. 阿里云安全组放行 8080

给 ECS 安全组加入方向规则：TCP **8080**。

> 安全建议：8080 尽量**只放行 GitHub 的 webhook 网段**（GitHub 公布在 https://api.github.com/meta 的 `hooks` 字段），而不是 0.0.0.0/0；同时确保 Jenkins 开了登录鉴权，别裸奔在公网。

## 完成后怎么用

本地照常写代码、`git push`。几秒后 Jenkins 自动跑：拉最新代码 → 重建容器 → 健康检查。去 Jenkins 看这次构建的日志即可；`http://<ECS_IP>:8787/health` 返回 ok 就是部署成功。

## 备注 / 排错

- **首次没触发**？先在 Jenkins 任务页点一次「Build Now」跑通，再靠 webhook 自动触发。
- **权限报错 `permission denied /var/run/docker.sock`**：第 1 步的 docker 组没生效，重启 Jenkins 或重登。
- **`JWT_SECRET:?...` 构建失败**：第 2 步的凭据 ID 没对上，或密钥没填。
- **数据安全**：DB 在具名卷 `ielts-data`，`docker compose down` 不加 `-v` 不会删卷；升级放心。想备份就 `docker run --rm -v ielts-data:/data -v $PWD:/backup alpine tar czf /backup/ielts-db.tgz -C /data .`。
- 想更稳可加**回滚**：部署前 `git rev-parse HEAD` 记下旧 commit，健康检查失败就 `git reset --hard <旧>` 再 `up -d --build`。需要的话我给你补进 Jenkinsfile。
