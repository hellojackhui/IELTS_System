// Hand-authored extension to the daily-scenario phrasebook (吃穿住行 · 居家向).
// Kept separate from scenarios.ts so the AI generator (scripts/generate-scenarios.mjs)
// never overwrites it. Merged into SCENARIOS in packages/core/src/index.ts.

import type { Scenario } from './scenarios';

export const EXTRA_SCENARIOS: Scenario[] = [
  {
    id: 'home',
    title: '居家 · 日常',
    icon: 'home-outline',
    sentences: [
      { en: "I usually wake up around seven and make a cup of tea.", zh: "我一般七点左右起床，泡杯茶。", tip: "描述日常开场最自然的一句" },
      { en: "Could you turn down the TV a little? I'm on a call.", zh: "能把电视调小声点吗？我在打电话。", tip: "和室友/家人说，turn down = 调小" },
      { en: "The washing machine finished — I'll hang the clothes out.", zh: "洗衣机洗好了，我去把衣服晾了。", tip: "hang out 这里指晾衣服" },
      { en: "Do you mind if I open the window for some fresh air?", zh: "我开下窗透透气，你介意吗？", tip: "礼貌请求用 Do you mind if..." },
      { en: "We're out of milk. Can you grab some on your way back?", zh: "家里没牛奶了，你回来的路上带点好吗？", tip: "out of = 用完了/没了" },
      { en: "The shower's leaking again — I'll ask the landlord to fix it.", zh: "淋浴又漏水了，我找房东来修。", tip: " landlord = 房东" },
      { en: "Could you help me move this sofa? It's heavier than it looks.", zh: "能帮我挪一下沙发吗？比看起来重。", tip: "搬重物求助时用" },
      { en: "I'll cook dinner tonight — anything you don't eat?", zh: "今晚我做饭，有没有你不吃的？", tip: "提前确认忌口，aligned with 请客场景" },
      { en: "The power went out for a second, but it's back now.", zh: "刚才断电了一下，现在恢复了。", tip: "power goes out = 停电" },
      { en: "Don't forget to take out the rubbish before you leave.", zh: "出门前别忘了把垃圾带下去。", tip: "take out the rubbish = 倒垃圾" },
      { en: "Would you like to come over for a movie this weekend?", zh: "这周末要不要过来一起看个电影？", tip: "come over = 过来（我家）" },
      { en: "I'm beat — I'm just going to crash early tonight.", zh: "我累瘫了，今晚直接早睡。", tip: "口语：beat = 累坏，crash = 倒头就睡" },
    ],
  },
  {
    id: 'weather',
    title: '天气 · 季节',
    icon: 'partly-sunny-outline',
    sentences: [
      { en: "It's pouring outside — take an umbrella.", zh: "外面下大雨呢，带把伞。", tip: "pouring = 倾盆大雨" },
      { en: "What's the weather like where you are?", zh: "你那边天气怎么样？", tip: "闲聊开场万能句" },
      { en: "It's supposed to clear up later this afternoon.", zh: "今天下午晚些时候应该会转晴。", tip: "clear up = 放晴" },
      { en: "It's freezing today — make sure you wear a coat.", zh: "今天冷死了，记得穿外套。", tip: "freezing = 极冷" },
      { en: "The forecast says it might rain this weekend.", zh: "天气预报说这周末可能会下雨。", tip: "forecast = 预报" },
      { en: "It's so humid I'm sweating just standing here.", zh: "太闷了，我站这儿都出汗。", tip: "humid = 潮湿闷热" },
      { en: "Be careful, the roads are icy this morning.", zh: "小心点，今早路面结冰了。", tip: "icy = 结冰的" },
      { en: "I love autumn here — the leaves turn golden.", zh: "我喜欢这儿的秋天，叶子变成金黄色。", tip: "turn + 颜色 = 变...色" },
      { en: "It's blowing a gale; hold onto your hat!", zh: "风大得离谱，抓紧你的帽子！", tip: "gale = 大风" },
      { en: "Is it usually this hot in July?", zh: "七月通常都这么热吗？", tip: "问气候习惯用 usually" },
      { en: "The heatwave finally broke — it's much cooler now.", zh: "热浪终于过去了，现在凉快多了。", tip: "heatwave = 热浪；break = 结束" },
      { en: "Lovely day, isn't it? Perfect for a walk.", zh: "天气真好，不是吗？正适合散步。", tip: "反义疑问句闲聊，很地道" },
    ],
  },
  {
    id: 'phone',
    title: '打电话 · 沟通',
    icon: 'call-outline',
    sentences: [
      { en: "Hi, is Jack there? — Sorry, can I take a message?", zh: "你好，Jack 在吗？——不好意思，要我转告吗？", tip: "接电话常用：take a message" },
      { en: "Could you tell him I called? My number is on his phone.", zh: "跟他说我打过电话好吗？我号码他手机里有。", tip: "留口信的标准说法" },
      { en: "Hang on a second, let me find a pen.", zh: "等一下，我找支笔。", tip: "hang on = 稍等" },
      { en: "I think we've got a bad line — can you hear me?", zh: "信号好像不太好，你听得到我吗？", tip: "bad line = 线路/信号差" },
      { en: "Sorry, you're breaking up. Could you repeat that?", zh: "抱歉，你声音断断续续的，能再说一遍吗？", tip: "breaking up = 信号断断续续" },
      { en: "Let me call you back in five minutes, okay?", zh: "我五分钟后再打给你，好吗？", tip: "call back = 回电话" },
      { en: "I'm returning your call about the booking.", zh: "我回你电话，是关于预订的事。", tip: "return someone's call = 回电" },
      { en: "Can you speak up a bit? It's really noisy here.", zh: "能大声点吗？这儿太吵了。", tip: "speak up = 说大声点" },
      { en: "I'll text you the address so you don't lose it.", zh: "我把地址发你短信，免得弄丢。", tip: "text = 发短信" },
      { en: "Sorry, wrong number.", zh: "抱歉，打错了。", tip: "打错电话最简洁的回应" },
      { en: "Please leave a message after the beep.", zh: "请在哔声后留言。", tip: "语音信箱提示语" },
      { en: "I'll put you through to the manager now.", zh: "我现在帮你转接经理。", tip: "put through = 转接（电话）" },
    ],
  },
  {
    id: 'bankpost',
    title: '银行 · 邮局',
    icon: 'business-outline',
    sentences: [
      { en: "I'd like to open a savings account, please.", zh: "我想开个储蓄账户。", tip: "savings account = 储蓄账户" },
      { en: "I need to withdraw some cash from my account.", zh: "我要从账户里取点现金。", tip: "withdraw = 取（款）" },
      { en: "Could I deposit this cheque into my account?", zh: "能把这张支票存入我账户吗？", tip: "deposit = 存；cheque = 支票" },
      { en: "What's the exchange rate for US dollars today?", zh: "今天美元兑换率是多少？", tip: "exchange rate = 汇率" },
      { en: "Is there a fee for using a foreign card here?", zh: "在这儿用外国卡要收手续费吗？", tip: "fee = 手续费" },
      { en: "I'd like to send this parcel by air mail.", zh: "我想用航空邮寄这个包裹。", tip: "parcel = 包裹；air mail = 航空信" },
      { en: "How much is the postage for a letter to the UK?", zh: "寄往英国的信邮费多少？", tip: "postage = 邮资" },
      { en: "Could I get a registered envelope for this document?", zh: "这份文件能给我个挂号信封吗？", tip: "registered = 挂号的（邮件）" },
      { en: "Do you have any photo ID? We need it to open the account.", zh: "有带照片的证件吗？开户需要。", tip: "photo ID = 带照片的身份证件" },
      { en: "I'd like to transfer money to another branch.", zh: "我想把钱转到另一个分行。", tip: "transfer = 转账" },
      { en: "Can I have a receipt for the deposit, please?", zh: "存款能给我张收据吗？", tip: "和换汇/银行都通用" },
      { en: "What time does the post office close on Saturdays?", zh: "邮局周六几点关门？", tip: "问营业时间" },
    ],
  },
];
