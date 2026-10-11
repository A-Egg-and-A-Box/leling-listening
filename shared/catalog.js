/* ============================================================
 * 曲库 · 共享底座
 * 「音乐作品助手」与「乐龄聆听计划」两个版本共用这一份数据。
 *
 * 每首曲子包含：
 *   parts  —— 分段聆听：把主题切成若干句，每句配一个引导问题；
 *            每句另有 t（秒）与可选的 p（分 P），点一下就能跳到
 *            对应乐句开始听，不用每次从头放。
 *   reveal —— 全部听完之后才揭晓的「答案」
 *   extend —— 延伸小知识
 * 设计原则：先让人听，再让人说，最后才给结论。
 * ============================================================ */
(function (global) {
  "use strict";

  var LEVELS = ["入门", "进阶", "欣赏"];

  var SONGS = [
    /* ---------- 入门 · 耳熟能详 ---------- */
    {
      id: "peter",
      title: "彼得与狼",
      composer: "普罗科菲耶夫",
      era: "20 世纪",
      level: "入门",
      emoji: "🐺",
      hue: 210,
      intro: "这是一首用音乐讲故事的名曲。每个角色都有自己的旋律，我们来找找看。",
      motif: "C5:1 D5:1 E5:1 G5:1 A5:1 G5:1 E5:1 D5:1 C5:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "先别急着判断。这一句是在往上走，还是往下落？", hint: "试着用手指跟着旋律比划一下高低。" },
        { label: "第二句", from: 4, to: 9, guide: "后半句听上去是轻快的，还是沉下来的？", hint: "注意旋律最后落在哪个音上——它是往上收，还是往下收？" },
        { label: "合起来", from: 0, to: 9, guide: "两句连起来，你脑海里有没有出现一个走路的形象？", hint: "不用说出对错，把你想到的画面记下来就好。" }
      ],
      reveal: "这是主人公彼得的主题。弦乐奏出明亮、跳跃的线条，像少年在阳光下大步走着。",
      extend: "普罗科菲耶夫用不同乐器代表不同角色：小鸟是长笛、鸭子是双簧管、狼是三支圆号。"
    },
    {
      id: "elise",
      title: "致爱丽丝",
      composer: "贝多芬",
      era: "古典主义",
      level: "入门",
      emoji: "🌸",
      hue: 330,
      intro: "这是一首几乎人人都听过的钢琴小品，我们从它的第一句开始。",
      motif: "E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5",
      parts: [
        { label: "第一句", from: 0, to: 5, guide: "开头这几个音，是挤在一起的，还是散开的？", hint: "它们挨得非常近，像在同一个地方来回轻碰。" },
        { label: "第二句", from: 5, to: 9, guide: "后半句突然往下走了，你的感觉变了吗？", hint: "往下走往往带着一点叹气、一点温柔。" },
        { label: "合起来", from: 0, to: 9, guide: "整句连起来听，像不像一个人在轻声打招呼？", hint: "记住这个感觉，一会儿揭晓答案。" }
      ],
      reveal: "这是贝多芬《致爱丽丝》的开头。钢琴用相邻的两个音来回轻碰，像小心翼翼的问候。",
      extend: "这首曲子原本叫《a 小调巴加泰勒》，「爱丽丝」这个名字是后人加上去的。"
    },
    {
      id: "ode",
      title: "欢乐颂",
      composer: "贝多芬",
      era: "古典 → 浪漫",
      level: "入门",
      emoji: "🎆",
      hue: 40,
      intro: "这是一段全世界都会唱的旋律，我们一句一句来听。",
      motif: "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这一句的步子，是大步还是小步？", hint: "几乎每个音都差不多长，像一步一步稳稳地走。" },
        { label: "第二句", from: 4, to: 9, guide: "第二句的结尾，是往上抬还是往下落？", hint: "它落回了最低的那个音，像回到起点。" },
        { label: "合起来", from: 0, to: 15, guide: "整段连起来，你觉得它是在往上长，还是在原地打转？", hint: "它其实一直在缓慢地往上爬，最后才稳稳落下。" }
      ],
      reveal: "这是贝多芬第九交响曲的《欢乐颂》。旋律像一条平坦的路，一步一步向上，最后稳稳落下。",
      extend: "《欢乐颂》的歌词来自席勒的诗，唱的是「四海之内皆兄弟」。"
    },
    {
      id: "canon",
      title: "卡农",
      composer: "帕赫贝尔",
      era: "巴洛克",
      level: "入门",
      emoji: "💍",
      hue: 265,
      intro: "这是一段被反复使用的旋律，听的时候留意：它是不是在重复。",
      motif: "F#5:1 E5:1 D5:1 C#5:1 B4:1 A4:1 B4:1 C#5:1.5",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这四个音，是往一个方向走的吗？", hint: "它们一级一级往下走，很规整。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句走到最低处之后，又做了什么？", hint: "它在最低处转了个弯，重新往上抬。" },
        { label: "合起来", from: 0, to: 8, guide: "你有没有听到同一条旋律被追着重复？", hint: "留意背景里另一条声部，它比你听到的晚一步。" }
      ],
      reveal: "这是帕赫贝尔《卡农》里最有名的下行线条。同一个旋律被一层层追着重复。",
      extend: "「卡农」不是曲名，而是一种写法：一条旋律追着另一条，像回声。"
    },
    {
      id: "molihua",
      title: "茉莉花",
      composer: "江苏民歌",
      era: "中国民歌",
      level: "入门",
      emoji: "🌼",
      hue: 335,
      focus: true,
      intro: "这是中国最有名的民歌之一。听的时候，留意它绕着哪几个音打转。",
      motif: "E4:1 E4:1 G4:1 A4:1 C5:1 C5:1 A4:1 G4:1 G4:1 A4:1 G4:1 E4:1 G4:1 E4:1 D4:1 C4:2",
      parts: [
        { label: "第一句", from: 0, to: 6, guide: "这一句是慢慢往上，还是一下子跳上去？", hint: "它一级一级往上，走到最高处又停了一下。" },
        { label: "第二句", from: 6, to: 12, guide: "后半句回到哪几个音附近打转？", hint: "它在中间那几个音上来回绕，很含蓄。" },
        { label: "合起来", from: 0, to: 16, guide: "整段听起来是外放的，还是收着的？", hint: "中国的旋律常常是收着的——不喊出来，慢慢说。" }
      ],
      reveal: "这是《茉莉花》。旋律围着几个音温柔地打转，含蓄又耐听。",
      extend: "《茉莉花》曾被意大利作曲家普契尼写进歌剧《图兰朵》。"
    },

    /* ---------- 进阶 ---------- */
    {
      id: "danube",
      title: "蓝色多瑙河",
      composer: "小约翰·施特劳斯",
      era: "浪漫主义",
      level: "进阶",
      emoji: "🌊",
      hue: 205,
      intro: "这是一首圆舞曲。先别管旋律，听听它的「步子」。",
      motif: "G4:1 C5:1 E5:1 G5:1 G5:1 G5:1 A5:1 B5:1 C6:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "数一数：一小节里强弱是怎么摆的？", hint: "一强两弱，一强两弱——这是三拍子的圆舞曲。" },
        { label: "第二句", from: 4, to: 9, guide: "后半句是一直往上冲的吗？", hint: "它一路向上，最后停在了最高音。" },
        { label: "合起来", from: 0, to: 9, guide: "整段像什么在流动？", hint: "像水波一圈一圈推开，也像人在旋转。" }
      ],
      reveal: "这是《蓝色多瑙河》的开头。三拍子的圆舞曲，旋律像水波一圈一圈推开。",
      extend: "它被称为奥地利「第二国歌」，每年维也纳新年音乐会都会演奏。"
    },
    {
      id: "erquan",
      title: "二泉映月",
      composer: "华彦钧（阿炳）",
      era: "中国近代民间音乐",
      level: "进阶",
      emoji: "🌙",
      hue: 250,
      focus: true,
      intro: "这是一把二胡拉出的心事。请把音量调低一点，慢慢听。",
      motif: "A4:1.5 G4:.5 A4:1 C5:1 D5:1 C5:1 A4:1 G4:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "开头两个音是往上还是往下？", hint: "先轻轻往上，又很快落回来，像一声叹息的开头。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句走到高处，又做了什么？", hint: "走到最高处，它没有停，而是缓缓滑下来。" },
        { label: "合起来", from: 0, to: 8, guide: "整句的情绪是往上扬的，还是往下沉的？", hint: "它是克制的——有起伏，但始终收着。" }
      ],
      reveal: "这是阿炳的《二泉映月》。二胡拉出的一声叹息，慢慢上行又落下。",
      extend: "阿炳是盲人艺人，常年在无锡街头拉琴，这首曲子写尽了他一生的心事。"
    },
    {
      id: "moonlight",
      title: "月光奏鸣曲",
      composer: "贝多芬",
      era: "古典主义 / 浪漫初期",
      level: "进阶",
      emoji: "🌕",
      hue: 225,
      intro: "这一段没有主旋律，请你听「律动」——它在不停地摇。",
      motif: "G#3:1 C#4:1 E4:1 G#3:1 C#4:1 E4:1 G#3:1 C#4:1 E4:1.5",
      parts: [
        { label: "第一句", from: 0, to: 3, guide: "这三个音，是一起响的还是轮流响的？", hint: "它们一个接一个往上，转着圈。" },
        { label: "第二句", from: 3, to: 6, guide: "第二组和第一组，是一样的吗？", hint: "完全一样——它在原地反复，像涟漪。" },
        { label: "合起来", from: 0, to: 9, guide: "整段听下来，你的呼吸是变快还是变慢了？", hint: "它很稳、很慢，容易让人安静下来。" }
      ],
      reveal: "这是《月光》第一乐章。钢琴像三连音的涟漪，一直在轻轻摇晃。",
      extend: "贝多芬自己给它的标题其实是「幻想曲风格奏鸣曲」，「月光」是后人取的。"
    },
    {
      id: "liangzhu",
      title: "梁祝",
      composer: "何占豪、陈钢",
      era: "1958 · 中国",
      level: "进阶",
      emoji: "🦋",
      hue: 350,
      focus: true,
      intro: "这是一段小提琴「唱」出来的旋律，很中国。",
      motif: "E4:1 G4:1 A4:1 C5:1 A4:1 G4:1 A4:1 G4:1 E4:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这一句是唱出来的，还是说出来的？", hint: "它拖得很长，像人在拉长声音说话。" },
        { label: "第二句", from: 4, to: 9, guide: "后半句往下走的时候，你的感觉是什么？", hint: "往下走带着一点不舍，像话说到一半又咽回去。" },
        { label: "合起来", from: 0, to: 9, guide: "你听出越剧的味道了吗？", hint: "它的转弯方式，来自浙江的越剧唱腔。" }
      ],
      reveal: "这是小提琴协奏曲《梁祝》的爱情主题。旋律婉转，像在娓娓讲述。",
      extend: "《梁祝》把越剧唱腔写进了交响乐，是中国「民族化」的经典。"
    },
    {
      id: "swan",
      title: "天鹅湖",
      composer: "柴可夫斯基",
      era: "浪漫主义 / 芭蕾",
      level: "进阶",
      emoji: "🦢",
      hue: 195,
      intro: "这是芭蕾舞剧里最著名的一段，听它像不像一只天鹅在水上。",
      motif: "B4:1 E5:1 F#5:1 G5:1 F#5:1 E5:1 F#5:1 E5:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "开头是轻轻上滑，还是一下子跳高？", hint: "它从低处慢慢往上够，像天鹅抬头。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句往上到顶之后，怎么下来的？", hint: "它没有直落，而是绕着弯缓缓下来。" },
        { label: "合起来", from: 0, to: 8, guide: "整段是明亮的，还是带一点忧伤的？", hint: "它很美，但美里有一点点寂寞。" }
      ],
      reveal: "这是《天鹅湖》里的天鹅主题。双簧管吹出柔软、略带忧伤的线条。",
      extend: "这段主题后来被反复改编，成了「天鹅」这个形象的代名词。"
    },

    /* ---------- 欣赏 · 挑战 ---------- */
    {
      id: "fate",
      title: "命运交响曲",
      composer: "贝多芬",
      era: "古典主义 / 浪漫初期",
      level: "欣赏",
      emoji: "⚡",
      hue: 15,
      focus: true,
      intro: "全曲只有四个音开头，但这四个音，你肯定听过。",
      motif: "G4:1 G4:1 G4:1 Eb4:3 F4:1 F4:1 F4:1 D4:3",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这四个音的长短是怎么排的？", hint: "三个短的，一个长的——短、短、短、长。" },
        { label: "第二句", from: 4, to: 8, guide: "第二组和第一组比，是升高了还是降低了？", hint: "整体往下挪了一点，语气更沉。" },
        { label: "合起来", from: 0, to: 8, guide: "这个节奏像什么动作？", hint: "像敲门——一下一下，很坚决。" }
      ],
      reveal: "这是《命运》开头那四声「敲门」。短—短—短—长，整首曲子都从它长出来。",
      extend: "贝多芬说：「命运就是这样敲门的。」"
    },
    {
      id: "moldau",
      title: "沃尔塔瓦河",
      composer: "斯美塔那",
      era: "民族乐派",
      level: "欣赏",
      emoji: "🏞",
      hue: 190,
      intro: "这是一条河的一生。我们先听它最温柔的那一段。",
      motif: "A4:1 C5:1 D5:1 E5:1 E5:1 D5:1 C5:1 D5:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "旋律是一直往前流，还是走走停停？", hint: "它几乎不停，像水一直在走。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句是往上还是往下？", hint: "它冲上去又绕回来，像水打了个旋。" },
        { label: "合起来", from: 0, to: 8, guide: "如果给它配画面，你会想到什么？", hint: "河流、田野、阳光——都可以。" }
      ],
      reveal: "这是斯美塔那《我的祖国》里的沃尔塔瓦河。旋律像河水缓缓流过。",
      extend: "它描写的是一条河从源头流向布拉格的全过程。"
    },
    {
      id: "overture1812",
      title: "1812 序曲",
      composer: "柴可夫斯基",
      era: "浪漫主义",
      level: "欣赏",
      emoji: "⚔️",
      hue: 25,
      intro: "这是一首很「大」的曲子，我们先听它庄严的一面。",
      motif: "G4:1 C5:1 D5:1 E5:1 C5:1 D5:1 E5:2",
      parts: [
        { label: "第一句", from: 0, to: 3, guide: "开头三个音是往上走的吗？", hint: "一级一级往上，很稳。" },
        { label: "第二句", from: 3, to: 7, guide: "后半句像不像在重复前半句？", hint: "很像，但位置更高，气势更大。" },
        { label: "合起来", from: 0, to: 7, guide: "整段给你什么感觉？", hint: "庄严、宽阔，像很多人一起唱。" }
      ],
      reveal: "这是《1812 序曲》里的俄罗斯赞美诗主题，庄严而宽阔。",
      extend: "这首曲子结尾真的会用到教堂钟声和礼炮。"
    },
    {
      id: "pictures",
      title: "图画展览会",
      composer: "穆索尔斯基",
      era: "民族乐派 / 印象派前",
      level: "欣赏",
      emoji: "🖼️",
      hue: 45,
      intro: "这是一段「走路」的音乐——作曲家在看画，边走边看。",
      motif: "G4:1 A4:1 G4:1 E4:1 G4:1 A4:1 G4:1 C5:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这一句像在走路吗？步子大不大？", hint: "不快不慢，一步一顿，像在展厅里踱步。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句停在哪儿了？", hint: "停在一个偏高的音上，像抬头看一幅画。" },
        { label: "合起来", from: 0, to: 8, guide: "整段有变化吗，还是一直一样？", hint: "它每次出现都略有不同，像走过不同的画。" }
      ],
      reveal: "这是《图画展览会》的「漫步」主题，像在展厅里慢慢走动。",
      extend: "穆索尔斯基为悼念一位画家朋友而写，用音乐去「看」一幅幅画。"
    },
    {
      id: "neworld",
      title: "自新大陆",
      composer: "德沃夏克",
      era: "浪漫主义",
      level: "欣赏",
      emoji: "🌍",
      hue: 155,
      focus: true,
      intro: "这段旋律后来被填上了歌词，很多老人都会唱。",
      motif: "E4:1 G4:1 G4:1 E4:1 D4:1 C4:1 E4:1 G4:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "开头是先上后下，还是先下后上？", hint: "先往上够一下，再落回来。" },
        { label: "第二句", from: 4, to: 8, guide: "后半句是不是又爬起来了？", hint: "它重新往上，最后停在高处。" },
        { label: "合起来", from: 0, to: 8, guide: "这段旋律给你什么情绪？", hint: "想念、乡愁——它是「念故乡」的调子。" }
      ],
      reveal: "这是德沃夏克第九交响曲的第二乐章，后来被填词成《念故乡》。",
      extend: "德沃夏克在美国写下它，却写满了对故乡波希米亚的思念。"
    },
    {
      id: "morning",
      title: "培尔·金特 · 晨景",
      composer: "格里格",
      era: "民族乐派",
      level: "欣赏",
      emoji: "🌅",
      hue: 35,
      intro: "这是一段描写日出的音乐，我们听它一点点亮起来。",
      motif: "G4:1 E4:1 D4:1 C4:1 D4:1 E4:1 G4:2",
      parts: [
        { label: "第一句", from: 0, to: 3, guide: "开头是往下还是往上？", hint: "它先轻轻往下，像晨雾还没散。" },
        { label: "第二句", from: 3, to: 7, guide: "后半句的方向变了吗？", hint: "它转成往上，像太阳升起来。" },
        { label: "合起来", from: 0, to: 7, guide: "你感觉到「越来越亮」了吗？", hint: "同样的旋律被反复抬高，光就一点点出来了。" }
      ],
      reveal: "这是《晨景》。旋律像太阳一点点升起，明暗交替。",
      extend: "它原本是为易卜生的戏剧《培尔·金特》写的配乐。"
    },
    {
      id: "rite",
      title: "春之祭",
      composer: "斯特拉文斯基",
      era: "现代 / 原始主义",
      level: "欣赏",
      emoji: "🌋",
      hue: 0,
      intro: "这是一首「不好听」的名曲。别怕，我们听听它为什么这么吵。",
      motif: "E4:1 Bb4:1 E4:1 Bb4:1 F4:1 B4:1 E4:2",
      parts: [
        { label: "第一句", from: 0, to: 4, guide: "这几个音靠得近还是远？", hint: "它们离得很远，撞在一起很刺耳。" },
        { label: "第二句", from: 4, to: 7, guide: "节奏是规整的，还是乱的？", hint: "重音一直在错位，让人站不稳。" },
        { label: "合起来", from: 0, to: 7, guide: "这种「不安」是故意的吗？", hint: "是故意的——它要写春天的原始力量。" }
      ],
      reveal: "这是《春之祭》的片段。节奏粗野、和声刺耳，当年首演还引发了骚乱。",
      extend: "1913 年首演时观众当场吵了起来，如今它却是现代音乐的里程碑。"
    },
    {
      id: "custom",
      title: "鉴赏其他曲子",
      composer: "你喜欢的任何作品",
      era: "自由聆听",
      level: "任意",
      emoji: "🎲",
      hue: 275,
      custom: true,
      intro: "这一首由你来定。点上面的按钮去 B 站找它；或回到首页把 B 站链接粘进来，我就能在这里直接放给你听，再陪你一句一句地听。",
      motif: "",
      parts: [
        { label: "听旋律", from: 0, to: 0, guide: "它的旋律是在往上走、往下走，还是原地打转？", hint: "用手比划一下高低，感觉会更清楚。" },
        { label: "听强弱", from: 0, to: 0, guide: "它是越来越响，还是慢慢变轻？哪里最响？", hint: "留意那个最响的瞬间，情绪往往就在那里。" },
        { label: "听音色", from: 0, to: 0, guide: "你能分辨出几件乐器？有没有一件特别突出？", hint: "不用说出名字，能听出「有一个人在前面唱」就够了。" }
      ],
      reveal: "这就是一套通用的聆听方法：先听走向，再听强弱，最后听音色。用它可以听任何一首曲子。",
      extend: "你还可以继续追问自己：这段音乐让我想起了什么？"
    }
  ];

  /* ---------- B 站播放源 ----------
   * 每首曲子预配一个 bvid：点开曲子，播放器直接嵌在页面里放，
   * 不用跳走。没有预配录音的曲子（如「鉴赏其他曲子」）留空，
   * 前端会给一个「去 B 站搜」的入口。
   */
  var VIDEO = {
    peter:        { bvid: "BV1Csvee7EtJ", title: "普罗科菲耶夫《彼得与狼》动画版（音乐启蒙）" },
    elise:        { bvid: "BV1Jnh1zsECX", title: "贝多芬《致爱丽丝》钢琴小品" },
    ode:          { bvid: "BV1bj411w77E", title: "贝多芬第九交响曲 第四乐章 欢乐颂" },
    canon:        { bvid: "BV1oE421c7g6", title: "帕赫贝尔《D大调卡农》弦乐版" },
    molihua:      { bvid: "BV1nj41137Bf", title: "《茉莉花》民乐演奏（古筝）" },
    danube:       { bvid: "BV1qBgGz3EvG", title: "蓝色多瑙河圆舞曲" },
    erquan:       { bvid: "BV1MY4y1G77J", title: "阿炳二胡独奏《二泉映月》1950 年原版" },
    moonlight:    { bvid: "BV1Yp4AzEEha", title: "贝多芬《月光奏鸣曲》第一乐章（肯普夫）" },
    liangzhu:     { bvid: "BV1Wb4y1d7mq", title: "《梁祝》小提琴协奏曲" },
    swan:         { bvid: "BV1KQUSBrEiu", title: "柴可夫斯基《天鹅湖》管弦乐组曲" },
    fate:         { bvid: "BV1GA4m157vJ", title: "贝多芬 c 小调第五交响曲「命运」" },
    moldau:       { bvid: "BV1H8411r7JJ", title: "斯美塔那《沃尔塔瓦河》（卡拉扬 / 柏林爱乐）" },
    overture1812: { bvid: "BV19N41187DE", title: "柴可夫斯基《1812 序曲》" },
    pictures:     { bvid: "BV1qVpFeCEnz", title: "穆索尔斯基《图画展览会》" },
    neworld:      { bvid: "BV1sN411778U", title: "德沃夏克《第九交响曲「自新大陆」》" },
    morning:      { bvid: "BV1AWBYB8E2T", title: "格里格《培尔·金特》组曲之《晨景》" },
    rite:         { bvid: "BV1J7SQBiET1", title: "斯特拉文斯基《春之祭》（拉特尔 / 柏林爱乐）" }
  };

  /* ---------- 分段聆听 · 跳转时间点 ----------
   * 每首曲子 3 句的起始秒数，对准上面那个 bvid 的录音：
   *   swan / moldau / pictures / rite 取自 B 站官方分段或 UP 主简介里的时间轴；
   *   其余取该作品主题在录音中的常见进入位置（0:00 表示主题就在开头）。
   * 目标是「点一下直接跳进这一句」，落点与录音略有出入时，
   * 可用播放器下方的「跳到 分:秒」手动微调 —— 不做假，也不硬凑。
   */
  var TIMES = {
    peter:        [120, 165, 120],
    elise:        [0, 12, 0],
    ode:          [222, 268, 222],
    canon:        [0, 10, 0],
    molihua:      [0, 30, 0],
    danube:       [45, 110, 45],
    erquan:       [0, 42, 0],
    moonlight:    [0, 65, 0],
    liangzhu:     [235, 300, 235],
    swan:         [0, 40, 0],
    fate:         [0, 5, 0],
    moldau:       [48, 105, 48],
    overture1812: [0, 62, 0],
    pictures:     [0, 55, 0],
    neworld:      [0, 45, 0],
    morning:      [0, 48, 0],
    rite:         [0, 11, 0]
  };

  /* 整乐章分成多个分 P 的曲子：「自新大陆」第二乐章才是《念故乡》 */
  var PAGE = { neworld: 2 };

  SONGS.forEach(function (s) {
    var v = VIDEO[s.id];
    if (v) { s.bvid = v.bvid; s.videoTitle = v.title; }
    var ts = TIMES[s.id];
    if (ts) {
      if (PAGE[s.id]) s.p = PAGE[s.id];
      s.parts.forEach(function (part, i) {
        part.t = ts[i] != null ? ts[i] : 0;
        if (PAGE[s.id]) part.p = PAGE[s.id];
      });
    }
  });

  global.MZCatalog = {
    levels: LEVELS,
    songs: SONGS,
    byId: function (id) {
      for (var i = 0; i < SONGS.length; i++) if (SONGS[i].id === id) return SONGS[i];
      return null;
    },
    /* 解析 "音名:拍数" 记谱 → [[音名, 拍数], ...] */
    parseMotif: function (str) {
      if (!str) return [];
      return str.trim().split(/\s+/).map(function (tok) {
        var p = tok.split(":");
        return [p[0], p[1] ? parseFloat(p[1]) : 1];
      });
    }
  };
})(typeof window !== "undefined" ? window : this);