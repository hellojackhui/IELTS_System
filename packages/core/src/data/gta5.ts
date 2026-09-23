/**
 * GTA5 · 洛圣都 —— 十场剧情的台词精学库（自用学习素材）。
 *
 * 每场 = 中文剧情梳理 + 各角色的可学台词（英文 / 中文 / 用法点）。
 * 台词为课堂式精选：保留自然口语（含粗口），剔除填充词与侮辱性 slur；
 * 这是学习用的选段，不是整场逐字转录。想要每一句原文可查 GTA 维基
 * 各关卡的 /Transcript 页。
 */

export interface GTA5Line {
  /** 说话人（英文名，界面直接展示） */
  who: string;
  en: string;
  zh: string;
  /** 词汇 / 习语 / 语法 用法点，可空 */
  tip?: string;
}

export interface GTA5Scene {
  id: string;
  /** 中文场景名 */
  title: string;
  /** 对应关卡英文名（副标题展示） */
  mission: string;
  /** 中文剧情梳理 */
  summary: string;
  lines: GTA5Line[];
}

export const GTA5_SCENES: GTA5Scene[] = [
  {
    id: 'prologue',
    title: '序章 · 北杨克顿劫案',
    mission: 'Prologue',
    summary:
      '2004 年，北杨克顿 Ludendorff 雪镇。麦克（当时叫 Michael Townley）、崔佛、布拉德三人抢劫 Bobcat 存款处——麦克控场、崔佛暴躁、布拉德鲁莽。得手后驾车逃亡，想赶在火车前跟直升机会合，却撞上路障。布拉德中弹，麦克也“中弹”倒地，让崔佛先撤。镜头切到九年后的葬礼：牧师念悼词——其实麦克跟联邦调查局做了交易假死，隐姓埋名成了洛圣都的 Michael De Santa。',
    lines: [
      { who: 'Brad', en: 'Get down there!', zh: '给我趴下去！', tip: 'get down 趴下/蹲下，控场指令' },
      { who: 'Michael', en: 'Everybody pays attention, no one gets hurt.', zh: '都给我听话，就没人受伤。', tip: 'pay attention 集中注意；抢劫控场经典句' },
      { who: 'Trevor', en: "Open the door, or they'll get worse than hurt!", zh: '开门，不然他们可不止是受伤那么简单！', tip: 'worse than 比…更糟；威胁句式' },
      { who: 'Michael', en: 'Hands behind your back.', zh: '手背到身后。', tip: '祈使句，无动词的控制指令' },
      { who: 'Michael', en: "Don't even think about it.", zh: '想都别想。', tip: "don't even think about it 别动歪脑筋，常用威慑语" },
      { who: 'Trevor', en: "Sit tight. I'll handle the plastic.", zh: '别乱动，炸药我来弄。', tip: 'sit tight 稍安勿动；plastic 塑性炸药(plastic explosive)' },
      { who: 'Michael', en: "Don't blow yourself up!", zh: '别把自己炸飞了！', tip: 'blow up 炸飞/爆炸' },
      { who: 'Trevor', en: 'Show me the money!', zh: '把钱给我亮出来！', tip: '同名电影梗，索要成果时的口头禅' },
      { who: 'Michael', en: 'Slow and steady, T. Slow and steady.', zh: '稳着点，T，稳着点。', tip: 'slow and steady 稳扎稳打（谚语 …wins the race）；麦克 vs 崔佛的性格对照' },
      { who: 'Michael', en: "We stick to the plan, we're home free.", zh: '照计划走，咱就安全脱身。', tip: 'stick to the plan 按计划来；home free 顺利过关（习语）' },
      { who: 'Brad', en: 'Cops. Coming our way.', zh: '警察，朝咱们来了。', tip: 'come one’s way 朝某人而来' },
      { who: 'Trevor', en: "Be cool... They ain't made this car yet.", zh: '淡定……他们还没盯上这辆车。', tip: 'be cool 别慌；make(俚语) 认出/识破' },
      { who: 'Michael', en: "Brad's gonna be fine, but we gotta get out of here.", zh: '布拉德没事的，但咱得赶紧撤。', tip: 'gotta = got to；get out of here 离开' },
      { who: 'Trevor', en: "Ain't gonna leave you, Mikey!", zh: '我不会丢下你的，Mikey！', tip: 'leave sb 抛下某人；ain’t = am not(口语)' },
      { who: 'Priest', en: 'He did not die a hero’s death. But he was a man.', zh: '他死得算不上英雄，但他是条汉子。', tip: '悼词句式；对“假死”的反讽' },
    ],
  },
  {
    id: 'therapy',
    title: '麦克的自白 · 心理治疗',
    mission: 'Dr. Isiah Friedlander sessions',
    summary:
      '现代线里，麦克花大价钱找名人心理医生 Isiah Friedlander 做治疗，一次次躺椅、电话倾诉——金窝里的空虚、跟老婆孩子的疏离、“想当好爸爸又想干回老本行”的撕裂、对暴力人生的怀念。医生表面开导，实则半吊子，更想拿麦克的猛料写书出名。这条线是全篇麦克“自白”的旁白，点透他的中年危机。（台词多为独白金句，非逐句转录。）',
    lines: [
      { who: 'Michael', en: 'Things have been pretty messed up.', zh: '最近真是一团糟。', tip: 'messed up 一团糟（口语，原句更粗）' },
      { who: 'Michael', en: 'I want to be a good dad... but I really want the other stuff, too.', zh: '我想当个好爸爸……可我也真还想干那些老勾当。', tip: 'the other stuff 委婉指“老本行/犯罪”；麦克的核心矛盾' },
      { who: 'Dr. Friedlander', en: "You're plainly addicted to chaos.", zh: '你分明就是沉迷于混乱。', tip: 'be addicted to 对…上瘾；plainly 显然' },
      { who: 'Michael', en: "I'm afraid I ain't got much hope.", zh: '我怕是没剩多少指望了。', tip: "I'm afraid 恐怕（委婉说坏消息）；ain't got = haven't got" },
      { who: 'Michael', en: 'Do you believe in evil?', zh: '你相信有“恶”这回事吗？', tip: 'believe in 相信…的存在' },
    ],
  },
  {
    id: 'father-son',
    title: '泳池初遇 · 收徒富兰克林',
    mission: 'Father/Son',
    summary:
      '撞车行之后，富兰克林被这个“退休劫匪”勾起好奇，主动上门“来喝那杯说好的酒”。麦克在自家豪宅泳池边抽烟慵懒，一副退休做派。两人第一次真正对话：麦克自嘲住藤木镇、种进口棕榈树假装知道自己在干嘛，摆出师父架子给富兰克林上“人生课”。正聊着，儿子吉米来电——偷卖游艇结果船被买家直接开跑，麦克“退休”瞬间结束，师徒档就此成形。',
    lines: [
      { who: 'Franklin', en: 'I come by for that drink you offered. That’s all.', zh: '我就来喝杯你说好的酒，没别的。', tip: 'come by 顺道过来' },
      { who: 'Michael', en: "I wasn't really serious about that.", zh: '我那话其实没当真。', tip: 'be serious about 认真对待' },
      { who: 'Michael', en: "You're not gonna rob me again?", zh: '你不会又来抢我吧？', tip: 'be gonna 将要；rob sb 抢劫某人' },
      { who: 'Franklin', en: 'I never robbed you. That was just a repossession.', zh: '我没抢你，那只是收回抵押物。', tip: 'repossession 收回（欠款的抵押品）' },
      { who: 'Michael', en: "Look... I'm retired.", zh: '听着……我退休了。', tip: 'retired 退休的；麦克的口头人设' },
      { who: 'Michael', en: 'What you saw the other day was a guy dealing with pests.', zh: '你那天看到的，是个在“除害”的人。', tip: 'the other day 前几天；deal with 处理；pest 害虫' },
      { who: 'Michael', en: "Today's lesson's all about humility.", zh: '今天这堂课，讲的是谦卑。', tip: 'be all about 核心就是；humility 谦逊' },
      { who: 'Michael', en: 'I was just lost in an eighties movie fantasy.', zh: '我刚陷进八十年代电影的幻想里了。', tip: 'be lost in 沉浸/走神于' },
      { who: 'Michael', en: "Lesson number one: don't ever have kids.", zh: '第一课：千万别生孩子。', tip: "don't ever 强调“绝不”；麦克式黑色幽默" },
      { who: 'Michael', en: "I ain't your homie. I'm someone you wanna impress.", zh: '我不是你哥们，我是你想去打动的人。', tip: 'homie 铁哥们(俚语)；impress 使钦佩' },
      { who: 'Franklin', en: 'But you can always buy another boat.', zh: '你大可以再买条船啊。', tip: 'can always 大可以…' },
      { who: 'Michael', en: 'Yeah, tell my accountant that.', zh: '是啊，这话你去跟我会计说。', tip: 'accountant 会计；麦克哭穷式吐槽' },
      { who: 'Michael', en: "Once I get us up close, you're the boarding party.", zh: '等我贴近，你就当登船队。', tip: 'get up close 靠近；boarding party 登船小队' },
      { who: 'Franklin', en: 'More like the falling-in-traffic party.', zh: '更像是“摔进车流小队”吧。', tip: 'more like 更像是；接梗谐音' },
      { who: 'Michael', en: 'Change of plans. My darling boy is in trouble.', zh: '计划有变，我宝贝儿子出事了。', tip: 'change of plans 计划有变；in trouble 有麻烦' },
    ],
  },
  {
    id: 'yoga',
    title: '瑜伽飞天 · 被下药',
    mission: 'Did Somebody Say Yoga?',
    summary:
      '阿曼达请私教 Fabien 在家教瑜伽，硬拉麦克一起练，麦克全程尬练加吐槽。练完，儿子吉米递上一杯“健康果昔”——里头掺了迷幻药。麦克当场恍惚，进入长时间幻觉：飘出屋子、飞越天空、遇上外星人和坠落感，配乐正是 The C90s《Shine a Light》(Flight Facilities Remix)。这段“飞天”几乎没台词，笑点全在前面那堂瑜伽课。',
    lines: [
      { who: 'Amanda', en: 'What is wrong with you, smoking in my house?', zh: '你什么毛病，在我家里抽烟？', tip: 'what is wrong with you 你怎么回事(责备)' },
      { who: 'Fabien', en: 'Did someone say yoga?', zh: '有人说“瑜伽”吗？', tip: '关卡名同款梗；said + 宾语从句省略' },
      { who: 'Fabien', en: 'Namaste, Amanda. Are we ready to practice?', zh: '合十礼，阿曼达。准备好开练了吗？', tip: 'namaste 瑜伽问候语；practice 练习' },
      { who: 'Fabien', en: 'We are all on our own journeys, Michael.', zh: '麦克，我们都走在各自的旅程上。', tip: "on one's journey 人生旅程（伪禅语）" },
      { who: 'Michael', en: 'So why is she driving a tank on hers?', zh: '那她那趟“旅程”咋像开着坦克？', tip: '承接上句 journey 的吐槽反问；on hers = on her journey' },
      { who: 'Fabien', en: 'The yoga is for sharing.', zh: '瑜伽是用来分享的。', tip: 'be for + -ing 用于做…' },
    ],
  },
  {
    id: 'reunited',
    title: '九年重逢 · 崔佛上门',
    mission: 'Friends Reunited',
    summary:
      '崔佛在《Fame or Shame》节目现场认出“死了九年”的老搭档麦克（现名 De Santa），当场破防。他驱车杀到洛圣都，站在山头俯瞰全城咬牙发狠，随后闯进麦克豪宅。九年的哀悼、被骗、背叛一次引爆，危险的旧搭档重新绑到一起。（这一场以崔佛的独白/暴走为主，可学的干净句偏少。）',
    lines: [
      { who: 'Trevor', en: 'So this is where dead men come back to life.', zh: '原来这儿就是死人复活的地方。', tip: 'come back to life 起死回生/复活' },
      { who: 'Trevor', en: "It's been nearly ten years.", zh: '都快十年了。', tip: "It's been + 时间：已经过去了…" },
      { who: 'Trevor', en: 'I grieved for you. You were my best friend.', zh: '我为你哀悼过，你可是我最好的兄弟。', tip: 'grieve for 为…悲痛' },
      { who: 'Trevor', en: "You weren't even dead.", zh: '你压根就没死。', tip: 'not even 甚至根本没…' },
      { who: 'Wade', en: 'I got you them bombs and the pistol with the thing that makes it go quiet on it.', zh: '我给你搞了那些炸弹，还有那把带“让它变安静的东西”的手枪。', tip: '韦德不知道“消音器(silencer/suppressor)”这个词，只能这么绕着形容' },
      { who: 'Wade', en: 'Are we not going to Los Santos then?', zh: '那咱们不去洛圣都了吗？', tip: 'Are we not…? 否定疑问：那…不…了吗' },
      { who: 'Wade', en: "We-woo, we-woo. That's my siren sound.", zh: '呜哇、呜哇。这是我的警笛声。', tip: 'siren 警笛；韦德学警笛声的呆萌梗' },
    ],
  },
  {
    id: 'threes-company',
    title: '三人成行 · 首次合作',
    mission: "Three's Company",
    summary:
      '联邦调查局(FIB)的 Steve Haines 逼三人合作，营救被特工机构关押的线人 Mr. K——崔佛吊在直升机下、麦克狙击掩护、富兰克林操作。这是麦克/崔佛/富兰克林三主角第一次同场协作，边干边斗嘴，活像闹剧版《天龙特攻队》。（此关维基无逐句转录页，可学句偏少。）',
    lines: [
      { who: 'Steve Haines', en: "We have received intel that they're keeping Mr. K at the local Agency station.", zh: '我们收到情报，他们把 Mr. K 关在当地机构的据点。', tip: 'intel 情报(intelligence 的缩略，军警常用)' },
      { who: 'Steve Haines', en: 'The Agency is stepping up their questioning because of your moronic antics.', zh: '因为你们那些蠢闹剧，机构正在加大审讯力度。', tip: 'step up 加大；moronic 愚蠢的；antics 胡闹/滑稽举动' },
      { who: 'Steve Haines', en: 'We need to get him out of there before he blabs.', zh: '得赶在他招供前把他弄出来。', tip: 'blab 乱讲/泄密(口语)；before 从句' },
    ],
  },
  {
    id: 'solomon',
    title: '所罗门·理查兹 · 电影梦',
    mission: 'Mr. Richards / The Ballad of Rocco / Legal Trouble',
    summary:
      '麦克是老牌制片人 Solomon Richards 的头号影迷，误打误撞进了他片场，帮偶像摆平难缠的导演演员、追回被抢的电影母带，最终把《崩溃危机》(Meltdown) 送上银幕、自己挂上“制片人”名号。所罗门招牌习惯：每次打电话开头先甩一句自己老电影里的台词，让麦克猜是哪部——麦克每次都答得上，还直说自己是铁粉。',
    lines: [
      { who: 'Solomon', en: "Never work with children or animals. I'll add to that list: never work with directors or actors.", zh: '都说别跟小孩和动物合作，我再加一条：别跟导演和演员合作。', tip: 'work with 与…共事；行业老炮吐槽' },
      { who: 'Michael', en: "I'm a huge fan.", zh: '我是你的铁粉。', tip: 'a huge fan of… …的忠实粉丝(高频口语)' },
      { who: 'Michael', en: 'It was An American Divorce, by the way — the movie quote... obviously.', zh: '顺便说，你引的那句台词是《美式离婚》里的……显然嘛。', tip: '印证“报片名”梗；by the way 顺便说' },
      { who: 'Devin', en: 'Good to see you, Slick!', zh: '见到你真好，滑头！', tip: 'Slick 绰号“滑头/油嘴”；Devin 对麦克的蔑称' },
      { who: 'Solomon', en: 'Michael! They’re screwing us! Wolves in sheep’s clothing!', zh: '麦克！他们在坑我们！披着羊皮的狼！', tip: 'screw sb 坑/整某人；wolf in sheep’s clothing 披着羊皮的狼(习语)' },
      { who: 'Solomon', en: 'Were you ever a human being?', zh: '你到底还算不算个人？', tip: '反问表愤慨' },
      { who: 'Michael', en: "I'm a producer! Nobody messes with my film!", zh: '我是制片人！谁也别想动我的电影！', tip: 'nobody messes with… 谁也别惹…；producer 制片人' },
      { who: 'Michael', en: 'I just wanna get the film back before she does anything rash.', zh: '我只想在她乱来之前把胶片拿回来。', tip: 'rash 轻率/鲁莽的；do something rash 冲动行事' },
      { who: 'Michael', en: 'A premiere? Can you invite my family? They can finally have something to be proud of me for.', zh: '首映？能请上我家人吗？他们总算能为我骄傲一回了。', tip: 'premiere 首映；be proud of 为…骄傲' },
      { who: 'Solomon', en: 'Michael, can you do something?', zh: '麦克，你能想想办法吗？', tip: 'do something 想办法/采取行动' },
      { who: 'Solomon', en: 'Capitalism depends on one thing and one thing only — a steady supply of idiots.', zh: '资本主义只靠一样东西——源源不断的傻子。', tip: '所罗门电话开场“报片名”梗；depend on 依赖；a steady supply of 稳定供应的' },
      { who: 'Michael', en: "Sorry, I can't place it.", zh: '抱歉，我想不起来是哪部了。', tip: "can't place it 认不出/想不起出处——难得麦克这次没答上" },
      { who: 'Solomon', en: 'Meltdown.', zh: '《崩溃危机》。', tip: '谜底揭晓：正是麦克刚帮他拍完的那部片' },
    ],
  },
  {
    id: 'bury-hatchet',
    title: '真相大白 · 北杨克顿墓地',
    mission: 'Bury the Hatchet',
    summary:
      '崔佛越想越不对——麦克真死了，坟里埋的是谁？他飞回北杨克顿雪地墓园，不顾麦克阻拦亲手挖开“麦克之墓”，棺材里躺的是布拉德。当年正是麦克跟 FIB 做交易假死、布拉德替他吃了那颗子弹。九年的信任在墓前碎裂。（关卡名 bury the hatchet 本意“化干戈为玉帛”，这里反着用。）',
    lines: [
      { who: 'Trevor', en: "You know what I'm thinking?", zh: '知道我在想什么吗？', tip: 'know what I’m thinking 常见反问开场' },
      { who: 'Michael', en: 'This is insanity.', zh: '这简直是发疯。', tip: 'insanity 疯狂/荒唐' },
      { who: 'Trevor', en: "It's clear and reasoned thought. Finally.", zh: '这是清醒、有条理的思考，终于。', tip: 'reasoned 有理有据的' },
      { who: 'Trevor', en: "I'm not gonna listen to another one of your lies!", zh: '我不会再听你的又一个谎话了！', tip: 'another one of 又一个…' },
      { who: 'Michael', en: "I'll lay it all out for you. Everything. Turn around.", zh: '我把一切都摊开跟你讲，全部。你转过来。', tip: 'lay it all out 和盘托出' },
      { who: 'Michael', en: "I'm trying to save you a trip.", zh: '我是想省得你白跑一趟。', tip: 'save sb a trip 让某人免于跑一趟' },
      { who: 'Michael', en: "Give it a rest, Trevor. There's nothing there!", zh: '崔佛，别挖了，那儿啥都没有！', tip: 'give it a rest 消停点/别再…了(口语)' },
      { who: 'Trevor', en: 'This is it. Moment of truth.', zh: '就是这儿了，见分晓的时刻。', tip: 'moment of truth 关键/见真章的时刻(习语)' },
      { who: 'Trevor', en: "As if I didn't know... Brad.", zh: '我早该想到……是布拉德。', tip: 'as if 好像(此处反讽)' },
    ],
  },
  {
    id: 'meltdown',
    title: '首映之夜 · 《崩溃危机》',
    mission: 'Meltdown',
    summary:
      '麦克监制的《崩溃危机》举行首映。加长礼宾车里，他和儿子吉米久违交心，父子关系回暖，麦克难得尝到“正经人生”的甜。可正当他志得意满，Devin Weston 派来的杀手动手了——Devin 亲自现身冷嘲热讽，把麦克的体面撕碎，为最终摊牌埋下火药。（礼宾车父子段维基无逐句转录页，可学句偏少。）',
    lines: [
      { who: 'Devin', en: 'Congratulations, Mikey, we did it.', zh: '恭喜啊 Mikey，咱“成”了。', tip: '反语式祝贺(阴阳怪气)' },
      { who: 'Devin', en: 'Such a pleasure working with you.', zh: '跟你合作真是“荣幸”。', tip: 'a pleasure working with you 商务客套(此处讽刺)' },
      { who: 'Devin', en: 'I was here. Unlike your wife, who seems to be stuck at home.', zh: '我可到场了；不像你老婆，好像被困在家里。', tip: 'unlike 不像；be stuck at home 困在家里' },
      { who: 'Devin', en: 'Hey, you missed the show, buddy! Trouble at home?', zh: '嘿，你错过好戏了，伙计！家里出事啦？', tip: 'miss the show 错过演出；阴阳怪气的问候' },
      { who: 'Michael', en: 'You came for my family?!', zh: '你冲我家人下手？！', tip: 'come for sb 冲某人来/找某人麻烦' },
      { who: 'Devin', en: 'Oh, I thought going after women was fair game.', zh: '哦，我还以为对女人下手也算“正当猎物”呢。', tip: 'go after 追击/对付；fair game 可攻击的正当目标(习语)' },
      { who: 'Michael', en: 'Molly died in an accident, and I’m sorry for that!', zh: '莫莉是死于意外，这点我很抱歉！', tip: 'die in an accident 死于意外；be sorry for 为…抱歉' },
      { who: 'Devin', en: 'Well, accidents happen, don’t they?', zh: '嗯，意外嘛，难免的，不是吗？', tip: 'accidents happen 意外难免(习语)；don’t they 反意疑问' },
      { who: 'Michael', en: "Send your private army after me if you have to. I won't be hiding!", zh: '你要愿意，就派你的私人军队来追我，我不会躲的！', tip: 'private army 私人武装；send sb after sb 派…去追…' },
    ],
  },
  {
    id: 'third-way',
    title: '大结局 · 处决 Devin',
    mission: 'The Third Way',
    summary:
      '面对“杀麦克还是杀崔佛”的逼选，富兰克林选了第三条路——三人联手反杀所有追债的敌人（FIB、Merryweather、崔佛的仇家），最后收拾幕后黑手 Devin Weston：塞进后备箱连人带车推下悬崖。尘埃落定，三个“合不来”的男人以朋友身份各自回归生活。',
    lines: [
      { who: 'Michael', en: 'This ends here, people!', zh: '今天就在这儿做个了断！', tip: 'end here 到此为止' },
      { who: 'Trevor', en: "The CEO position's going to be vacant real soon, Slick.", zh: 'CEO 的位子很快就空出来咯，滑头。', tip: 'vacant 空缺的；real soon(口语)=really soon' },
      { who: 'Trevor', en: 'No more talkie!', zh: '别废话了！', tip: 'talkie 戏谑造词(=talking)，口语调侃' },
      { who: 'Michael', en: 'Now we keep a low profile and get on with our lives.', zh: '往后咱低调做人，各过各的日子。', tip: 'keep a low profile 保持低调(高频习语)；get on with 继续过' },
      { who: 'Trevor', en: 'As friends.', zh: '以朋友的身份。', tip: 'as friends 作为朋友' },
      { who: 'Michael', en: 'What, do I have a choice?', zh: '咋，我还有得选吗？', tip: 'have a choice 有选择余地' },
      { who: 'Michael', en: 'Flawed, awful, totally uncomfortable and poorly matched friends. Absolutely.', zh: '一对满身毛病、糟糕透顶、别扭又不搭的朋友，没错。', tip: 'flawed 有缺陷的；poorly matched 不般配；一串形容词的自嘲' },
      { who: 'Michael', en: "I'm getting too old for this nonsense.", zh: '这种破事我是真玩不动了。', tip: 'too old for… 对…来说太老；getting + 比较级' },
    ],
  },
];

/** 台词总数（界面统计用）。 */
export const GTA5_LINE_COUNT = GTA5_SCENES.reduce((n, s) => n + s.lines.length, 0);
export const GTA5_SCENE_COUNT = GTA5_SCENES.length;
