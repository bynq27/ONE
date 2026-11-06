// 第一章剧本数据。剧本用一套很小的脚本语法写成，见 engine.js 顶部的说明。
(function () {
  window.YY = window.YY || {};

  YY.EVIDENCE = {
    chuge: { name: '初勘尸格', icon: 'doc', desc: '县尉初验的尸格：「死者钱大有，年四十五，清风楼掌柜。胸前刀伤一处，长一寸二分，深透，致命。他处无伤。」' },
    jilu: { name: '初勘记录', icon: 'doc', desc: '县尉次日清晨的现场记录：「尸身仰卧灶前，血泊在头下。孙敬握刀立于尸旁，袖染血。后门未闩。柴房立湿伞一把。」' },
    chongyan: { name: '重验尸格', icon: 'docred', desc: '老樊重验：「致命伤在后脑，圆形凹陷，宽约一寸半，有血荫，生前伤。胸前刀伤无血荫、皮肉不卷，死后伤。」' },
    zhangbu: { name: '账簿', icon: 'book', desc: '钱掌柜的账簿。「九月初一，周四郎借钱三百贯，期九月十五还。」末页盖着一枚小小的朱红虫印。' },
    chengtuo: { name: '秤砣', icon: 'weight', desc: '后厨大秤的秤砣，在水缸底找到。大小与死者后脑的伤口吻合。' },
    caidao: { name: '菜刀', icon: 'knife', desc: '后厨的菜刀，刀身和刀柄都有血。孙敬说是他慌乱中从掌柜胸口拔出来的。' },
    menshuan: { name: '后门门闩', icon: 'bar', desc: '门闩装在门内，从外面拔不开。出事次日清晨，门闩是拔开的。' },
    san: { name: '油纸伞', icon: 'umbrella', desc: '立在清风楼柴房里。撑开后，伞面内侧写着「周记绸缎」。初勘记录说，次日清晨伞面还是湿的。' },
    sunkou: { name: '孙敬口供', icon: 'docseal', desc: '翻异后的口供：那晚醉酒早睡，半夜下楼找水，发现掌柜胸口插着刀，慌乱中拔了出来。周四郎欠掌柜三百贯，九月十五到期。' },
    pingmian: { name: '清风楼平面图', icon: 'plan', desc: '阿福画的。账房孙敬的卧房正在前堂楼上，后厨在另一头。' },
    gengfu: { name: '更夫证词', icon: 'bang', desc: '更夫老钟：那天白天晴了一整天，酉时一刻才下雨。雨太大，整夜没有巡更。' },
    puzheng: { name: '老仆证词', icon: 'docseal', desc: '周家老仆：老爷「二更前」回家，浑身湿透，没打伞。回家后独自去灶房烧了东西。' },
    jieju: { name: '借据残片', icon: 'burnt', desc: '周家灶膛里烧剩的一角，能认出「……百贯……九月十五」。' },
    suoyi: { name: '蓑衣', icon: 'cape', desc: '挂在州桥桥桩上，领口系着阿福娘给的红绳，是清风楼的。里侧沾满发黑的血。' }
  };

  YY.INVESTIGATE = {
    houchu: {
      spots: [
        { id: 'zao', label: '灶台', x: 212, y: 250, node: 'hc_zao' },
        { id: 'dao', label: '菜刀', x: 95, y: 214, node: 'hc_dao' },
        { id: 'gang', label: '水缸', x: 298, y: 292, node: 'hc_gang' },
        { id: 'cheng', label: '大秤', x: 400, y: 150, node: 'hc_cheng' },
        { id: 'men', label: '后门', x: 511, y: 270, node: 'hc_men' },
        { id: 'chai', label: '柴房', x: 608, y: 210, node: 'hc_chai' }
      ]
    }
  };

  YY.MAP = {
    locs: [
      { id: 'jail', label: '开封府大牢', x: 115, y: 95, node: 'v_jail' },
      { id: 'qt', label: '清风楼', x: 310, y: 160, node: 'v_qt' },
      { id: 'street', label: '甜水巷口', x: 180, y: 205, node: 'v_street' },
      { id: 'shop', label: '周记绸缎庄', x: 520, y: 310, node: 'v_shop' },
      { id: 'bridge', label: '州桥', x: 420, y: 196, node: 'v_bridge', req: f => f.f_suoyi && f.f_nosan }
    ],
    need: ['sunkou', 'pingmian', 'gengfu', 'puzheng', 'jieju', 'suoyi'],
    auto: [{ cond: f => f.f_suoyi && f.f_nosan && !f.bridge_told, node: 'bridge_unlock' }],
    hint(G) {
      const f = G.flags;
      if (!G.visited.jail) return '先去大牢听听孙敬自己怎么说。';
      if (!G.visited.qt) return '清风楼的阿福那晚就在前堂，去问问他。';
      if (!G.visited.street) return '那晚的天气和打更，巷口的更夫最清楚。';
      if (!G.visited.shop) return '账簿上那个借了三百贯的周四郎，该去会会他了。';
      if (f.f_suoyi && f.f_nosan && !G.visited.bridge) return '周四郎回家必过州桥。去桥下看看。';
      return '该问的都问了。明日开堂吧。';
    }
  };

  YY.TRIALS = {
    r1: {
      title: '那晚听见的', who: 'fu', wrong: 'wrong1',
      st: [
        { k: 'k1', t: '那晚打烊上完门板，小的就在前堂打地铺睡了。', p: 'r1p1' },
        { k: 'k2', t: '刚躺下没多久，就听见后厨有人吵架。', p: 'r1p2' },
        { k: 'k3', t: '是掌柜和账房先生在吵！掌柜喊着什么“账”、什么“还”的。', p: 'r1p3' },
        { k: 'k4', t: '后来没动静了，小的就睡着了。', p: 'r1p4' },
        { k: 'k5', t: '到了三更，小的被一声大叫吵醒，跑进后厨，就看见账房先生拿着刀！', p: 'r1p5' }
      ],
      present: { 'k3:pingmian': 'r1ok', 'k3:sunkou': 'r1_sun' },
      side: { 'k5:caidao': 'r1_dao' }
    },
    r2: {
      title: '不在场', who: 'zhou', wrong: 'wrong2',
      st: [
        { k: 'k1', t: '那晚戌时，草民与钱兄喝了几杯，便起身告辞。', p: 'r2p1' },
        { k: 'k2', t: '阿福亲眼看着草民撑伞出的门，大人可以问他。', p: 'r2p2' },
        { k: 'k3', t: '出门后，草民一路冒雨走回州桥南的家中。', p: 'r2p3' },
        { k: 'k4', t: '到家时二更未到，家中老仆可以作证。', p: 'r2p4' }
      ],
      present: { 'k3:san': 'r2a', 'k3b:gengfu': 'r2ok' },
      side: { 'k4:puzheng': 'r2_pu', 'k3b:jilu': 'r2_jilu' }
    },
    r3: {
      title: '走的时候', who: 'zhou', wrong: 'wrong3',
      st: [
        { k: 'k1', t: '草民回去，是想求钱兄宽限几日。钱兄答应了。', p: 'r3p1' },
        { k: 'k2', t: '说完话，草民从后门走的，钱兄亲自送到门口。', p: 'r3p2' },
        { k: 'k3', t: '伞落在柴房里，草民就借了店里的蓑衣，冒雨回了家。', p: 'r3p3' },
        { k: 'k4', t: '钱兄的死，跟草民没有半点关系！三更时拿着刀的，是那个账房！', p: 'r3p4' }
      ],
      present: { 'k2:menshuan': 'r3_door', 'k4:chongyan': 'r3_wound', 'k4:chengtuo': 'r3_wound', 'k5:suoyi': 'r3final', 'k3:suoyi': 'r3_suoyi' },
      side: { 'k1:jieju': 'r3_jieju' }
    }
  };

  YY.SCRIPT = String.raw`
# start
@bg black
@fx rain on
@wait 700
@title 北宋 · 汴京|九月十四　夜
@bg bridgeNight
@chars shadow@-40
@move shadow 300 2600
@wait 500
@state shadow throw
@wait 1300
@move shadow 720 2000
@bg black
@chars
@fx rain off
@wait 500
@goto open

# open
@checkpoint
@title 开场|喊冤
@bg hall
@chars sun@L+jia+kneel han@C
han: 孙敬，你谋杀东家钱大有，供状在此，画押在此。本官再念一遍，你若无异议，即日结案。
sun: ……
han: “九月十四夜二更，犯人孙敬因账目与东家钱大有争执，持后厨菜刀刺其胸口，致死……”
sun[shock]: 冤枉！大人，小人冤枉啊！
（堂下一片哗然。）
@state sun sad
sun: 那供状……是小人受刑不过才画的押！小人那晚喝醉了，一直睡到三更，下楼才看见掌柜倒在地上……小人没有杀人！
@state han slam
@fx slam
han: 大胆！画了押还敢翻供？
@state han idle
sun: 小人临死，只求一句真话……冤枉……
han: ……罢了。犯人翻异，按例别勘。来人，案子移送提刑司。
@enter shen@R
shen: 提刑司检法官沈砚，奉命接手此案。
han: 你就是新调来的那个？书读得多，案子办过几件？
shen: 在地方上办过一些。
han: 本官把话说在前头。一桩铁案，人证物证口供俱全，只因犯人临死喊了声冤，就要从头再查。
han: 三日。三日后若查不出新东西，照原判结案。
shen: 三日足够了。
han: 哼。
@chars shen@L fan@R
fan: 哟，这就是新来的检法官？细皮嫩肉的，手比我家闺女还干净。
shen: 这位是……
fan: 仵作，姓樊，叫老樊就行。提刑司派我来跟你，说是“协助”，我看是来给你收拾烂摊子的。
shen: 那就有劳樊老了。尸首在哪里？
fan: 城西义庄。三天了，再不验就只能验骨头了。走吧，书生。
@get chuge
@get jilu
sys: 右上角的「卷宗」可以随时翻看已经拿到的证物。
@goto act1

# act1
@checkpoint
@title 第一幕|勘验
@bg yizhuang
@chars fan@L shen@R
fan: 苍术，熏一熏，去去晦气。你要是想吐，出门左转。
shen: 我没事。
fan: 那就先看看初审怎么写的。
@show chuge
fan: 我把白布掀开，你看看胸口那一刀。凑近点，看皮肉。
shen: 刀口的边……是平的，没有往外翻卷。颜色也发白。
fan: 嗯。活人挨刀，皮肉一缩，刀口会往外卷，四周还有一圈青紫的血荫。
fan: 人死了再砍，血不走了，刀口就是这样，又白又平，跟切猪肉一样。
sys: 尸格对照：尸格上哪一句，和你亲眼看到的不一样？
@hint 刀口又白又平，没有血荫。这一刀砍下去的时候，人还活着吗？
@choice doc:初勘尸格
- 死者钱大有，年四十五，清风楼掌柜。 -> yz_w1
- 胸前刀伤一处，长一寸二分，深透。 -> yz_w2
- 致命。 -> yz_ok1
- 他处无伤。 -> yz_w3
fan: 你翻翻初勘记录，他们说血在哪儿？
@show jilu
shen: “尸身仰卧灶前，血泊在头下。”胸口挨了一刀，血却都在脑袋底下？
fan: 那你说，该看哪儿？
@hint 血都在头下面。
@choice
- 看看他的双手 -> yz_hand
- 解开发髻，看后脑 -> yz_head
- 看看他的双脚 -> yz_foot
@goto act1b

# yz_w1
fan: 名字年纪你也要挑？再看看刀口。
@retry
# yz_w2
fan: 刀口是在那儿，长短也没量错。错的不在这一句。
@retry
# yz_w3
fan: 这一句先放着，一会儿再说。眼下先说刀口。
@retry
# yz_ok1
shen: “胸前刀伤，致命”……可这一刀砍下去的时候，钱掌柜已经死了。
@state shen point
@fx slam
shen: 致命的不是这一刀。
@state shen idle
fan: 还行，没白读书。
shen: 那他是怎么死的？尸格上写着“他处无伤”。
fan: 初审那帮人，看见胸口一个窟窿，就不往下看了。

# yz_hand
fan: 手上干干净净，指甲缝里什么都没有。他连挣扎都没来得及。
@retry
# yz_foot
fan: 脚？他又不是走路摔死的。血在哪儿，就往哪儿看。
@retry
# yz_head
fan: 这就对了。
@fx dark on
（老樊解开死者的发髻，用骨梳一点一点拨开头发。）
@fx dark off
shen: 后脑……陷下去一块。圆的。
fan: 一寸半宽，边上一圈血荫，紫得发黑。活着的时候挨的，一下就要了命。
fan: 圆的，沉的，钝的。不是刀，是锤子一类的东西。
shen: 头发把伤口盖住了，所以初审没看到。
fan: 从背后砸的，人往前一扑就没了。能让钱掌柜放心把后背露出来的，八成是熟人。
sys: 尸格对照：现在，尸格上还有哪一句不对？
@hint 伤在后脑，被头发盖住了。尸格上说别处有没有伤？
@choice doc:初勘尸格
- 死者钱大有，年四十五，清风楼掌柜。 -> yz_w4
- 胸前刀伤一处，长一寸二分，深透。 -> yz_w4
- 致命。 -> yz_w5
- 他处无伤。 -> yz_ok2
# yz_w4
fan: 刚看完后脑，你倒忘了？
@retry
# yz_w5
fan: 这一句刚才已经驳过了。
@retry
# yz_ok2
@state shen point
shen: “他处无伤”。伤明明就在后脑，只是被头发盖住了。
@state shen idle
@get chongyan
shen: 先砸死，再补一刀。补这一刀，是要让人以为他是被刀杀的。
fan: 后厨的刀，谁都拿得到。可要让人往账房身上想，就得有人知道账房白天跟掌柜吵过架。
shen: 去清风楼。

# act1b
@checkpoint
@bg houchu
@chars
（清风楼后厨。地上的血迹已经干成黑褐色。）
sys: 自由调查：点击画面上的标记查看。六处都看过之后，才能离开。
@hint 灶台、菜刀、水缸、大秤、后门、柴房，一处一处看，别漏了。
@investigate houchu
shen: 秤砣、门闩、伞……这间后厨里藏着的东西，比初审写的多得多。
fan: 我说书生，要不直接去把周四郎抓来？
shen: 凭一把伞，他有一百种说法。先把那晚的事一件件问清楚。
@goto act2

# hc_zao
shen: 钱掌柜那晚在这里算账？
fan: 灶边暖和，开酒楼的都爱在这儿算。
shen: 账匣开着。初勘记录写钥匙挂在死者腰上。凶手从他身上摸了钥匙，打开账匣，拿走了什么。
shen: “九月初一，周四郎借钱三百贯，期九月十五还。”九月十五，就是出事的第二天。
fan: 三百贯？够买半条街的铺子了。
shen: 最后一页盖着一枚印……很小，朱红色，印文像是一只虫子。
fan: 酒楼账簿上盖什么虫子？
shen: 不知道。先记下。
@get zhangbu

# hc_dao
shen: 这就是初审说的“凶器”。刀身有血，刀柄上也有血，是孙敬握过的。
fan: 他自己说是拔出来的。人看见自家东家胸口插着刀，脑子一热，伸手就拔，这事我见过不止一回。
@get caidao

# hc_gang
fan: 我来。（挽起袖子，把胳膊伸进缸里）……哎哟，凉。等等，底下有东西。
fan: 一枚秤砣。（放在手心里比了比）一寸半上下。跟后脑那个坑，严丝合缝。
shen: 砸完扔进水缸，血就洗掉了。
@get chengtuo

# hc_cheng
shen: 秤杆在，秤盘在，秤砣不见了。
fan: 秤砣……圆的，沉的，钝的。
@state shen nod
fan: ……我就随口一说。
@state shen idle

# hc_men
shen: 初勘记录写着，第二天早上，后门的门闩是拔开的。
fan: 门闩在里头，从外面拔不开。
shen: 所以，是有人从里面拔开门闩，从后门出去了。孙敬住在楼上，阿福睡在前堂，他们都没有理由走后门。
fan: 门边这个钩子是空的。原来挂着什么？
shen: 得问问店里的人。
@get menshuan

# hc_chai
shen: 初勘记录写着“柴房立湿伞一把”。那天早上，伞还是湿的。
fan: 一把伞，有什么稀奇。
shen: 店里的伞，该挂在前堂给客人用，怎么会靠在柴房里？
（沈砚把伞撑开。伞面内侧，写着几个墨字。）
shen: “周记绸缎”。
fan: 周记……账簿上那个借了三百贯的周四郎？
shen: 他的伞，为什么在清风楼的柴房里？
@get san

# act2
@checkpoint
@title 第二幕|走访
@bg map
@chars
sys: 汴京地图：选择要去的地方，顺序随你。该问的都问到了，就会出现「明日开堂」。
@map
@goto act3

# v_again
fan: 这儿已经问过了。别磨蹭，书生。

# bridge_unlock
@set bridge_told
fan: 书生，我琢磨个事。周四郎出门带了伞，回家却没打伞，浑身湿透。清风楼的蓑衣又不见了。
fan: 从清风楼到周家……
shen: 必过州桥。
sys: 地图上出现了新的地点：州桥。

# v_jail
@bg jail
@chars shen@L sun@R+jia
（孙敬靠墙坐着，十根手指肿得发紫。）
sun: 大人……您真是来查案的？
shen: 我是来听你说实话的。那晚，从头说。
sun: 那天白天，小人跟掌柜为一笔酒钱对不上，吵了几句。晚上心里憋闷，自己在屋里喝了一壶，天还没黑透就睡了。
shen: 什么时候醒的？
sun: 半夜口渴醒了，也没听见打更……反正是半夜。小人下楼去后厨找热水，一进门就看见掌柜仰面躺着，胸口插着刀。
sun[sad]: 小人吓傻了，想着把刀拔出来人兴许还有救，就……就拔了。然后阿福就冲进来了。
@state sun idle
fan: 你喝了一壶就睡死了？中间什么都没听见？
sun: 小人……睡觉沉。阿福老说小人打呼噜，吵得他睡不着。
shen: 周四郎这个人，你知道吗？
sun: 周四爷？掌柜的结拜兄弟，常来吃酒。他欠掌柜三百贯，九月十五到期。前几天掌柜还跟小人说，“老四这回再拖，我就去告官”。
@get sunkou
sun: 大人，小人那份供状……
shen: 你受苦了。那份供状，我会让它作废。

# v_qt
@bg qiantang
@chars shen@L fu@R
（桌椅都摞起来了。阿福一见官服，手里的抹布就开始抖。）
fu: 大、大人！小的什么都没干！小的那晚一直在前堂睡觉！
fan: 没人说你干了什么。抖什么。
fu: 小的天生就抖……
shen: 周四郎那晚是什么时候走的？
fu: 周四爷？戌时就走了！小的亲眼看着，四爷撑着伞从前门出去的，还回头说“小福子，明儿给你带糖糕”。四爷人可好了。
shen: 他走之前，去过后院吗？
fu: 去过一趟茅厕……这也要问？
shen: 后门的门闩，那晚是谁闩的？
fu[sad]: 小的！打烊上完门板，小的就去闩后门，天天如此！可早上门闩是开的，县尉老爷说是小的忘了……小的明明闩了……
@state fu idle
shen: 我信你闩了。后门边墙上有个空钩子，原来挂的是什么？
fu: 蓑衣！店里的蓑衣，下雨天小的去河边打水穿的。领口系着一根红绳，是小的娘给的。出事以后就不见了，小的还以为是衙门拿走了。
@set f_suoyi
shen: 你住前堂，楼上住着谁？
fu: 账房先生！他那屋就在小的头顶上。小的画给您看——前堂在这儿，楼梯在这儿，账房先生的屋子正好在上面，后厨在那一头。
@get pingmian
fu: 大人，账房先生真不是坏人……可那晚小的真听见了，二更天，掌柜跟账房先生在后厨吵架！
shen: 你看见是账房先生了？
fu: 没看见……可掌柜喊着什么“账”、什么“还”，不是账房先生还能是谁？
sys: 这段话先记在心里。到了公堂上，可以正式质证。

# v_street
@bg street
@chars shen@L zhong@R
zhong: 查案的？那晚我可什么都没看见，我在家睡觉呢。
shen: 更夫不打更，在家睡觉？
zhong: 大人您不知道，那雨大得，跟天漏了似的！我出门走了两步，灯笼就灭了，梆子也敲不响，干脆回家了。整宿没打更，这一片的人都知道。
shen: 雨是什么时候下的？
zhong: 酉时一刻。我记得清楚，刚吃完晚饭。那天白天还大太阳呢，晒得我都脱了褂子，谁知道傍晚说下就下。
shen: 白天一直是晴天？
zhong: 一滴雨都没有，晴了一整天。
@get gengfu
fan: 阿福说“二更天听见吵架”，可那晚根本没人打更。
shen: 他那个“二更”，是自己估的。他的话里，有些是听见的，有些是他自己想的。

# v_shop
@bg shop
@chars shen@L zhou@R
（铺面冷清，货架空了一半。周四郎慢慢摇着折扇迎出来。）
zhou: 哎呀，提刑司的大人！钱兄的事，我听说了，心里难受得几天没睡着。有什么要问的，四郎知无不言。
shen: 那晚你在清风楼吃酒？
zhou: 是。和钱兄喝了几杯，戌时就告辞了。阿福那孩子看着我走的。
shen: 之后呢？
zhou: 冒着雨走回家。到家二更还没到，就歇下了。家里老仆可以作证。凶手不是已经抓到了吗？
shen: 例行问话。听说你欠钱掌柜三百贯？
zhou: 那点钱，钱兄早说了不急。我们是结拜兄弟，几十年的交情。
shen: 你的伞呢？
zhou: ……伞？在家里吧。大人问这个做什么？
shen: 随口一问。
@chars shen@L pu@R
（周四郎进了内堂。老仆端茶上来。）
pu: 大人请用茶。
fan: 老人家，那晚你家老爷什么时候回来的？
pu: 二更前。老爷吩咐过，大人问起就这么说……不是，老爷是二更前回来的。
fan: 哦——回来时什么样？
pu: 浑身湿透了，跟从河里捞上来似的，伞也没打。小的还说，老爷您出门明明带了伞，老爷就骂小的多嘴。
pu: 那晚老爷换了衣裳，还一个人去灶房烧了些东西，不让小的跟着……
@state pu shock
pu: 小的什么都没说！
@get puzheng
@set f_nosan
@bg zhouzao
@chars shen@L
（周家灶房。灶膛里一层冷灰，老樊用火钳扒了扒。）
fan: 这儿有一片没烧干净的。
shen: “……百贯……九月十五”。
fan: 借据。
shen: 钱掌柜的账匣被人打开过。从账匣里拿走的，就是这张借据。
@get jieju

# v_bridge
@bg bridgeDay
@chars shen@L fan@R
（雨后的汴河水浑黄。桥桩上缠着一团枯草似的东西。）
fan: 我拿竹竿够够看……够着了！
（湿漉漉的蓑衣被拖上岸。领口系着一根褪色的红绳。）
shen: 红绳。阿福说过，店里那件蓑衣领口系着红绳。
fan: （翻开蓑衣内侧，凑近闻了闻）里面有血。泡了几天水，还没洗干净，都渗进草里了。
shen: 外面淋雨，血却在里面。有人身上沾着血，披上蓑衣遮住，过桥时扔进了河里。
@call flash
@bg bridgeDay
@chars shen@L fan@R
@get suoyi
fan: 够了吧？抓人？
shen: 明日开堂。让他自己说。

# flash
@bg bridgeNight
@fx rain on
@chars shadow@200
@state shadow throwfan
@wait 1800
@fx rain off

# act3
@checkpoint
@title 第三幕|公堂
@bg hall
@chars shen@L han@C fu@R
@lq reset
han: 沈检法，三日之期已到。你说有新证据，本官倒要听听。
shen: 请先传证人阿福。
sys: 公堂质证：证人陈述证词时，可以对每一句「追问」；发现哪一句和证物矛盾，就在那一句「出示」证物。
@lq show
sys: 画面右上角是五支令签，代表韩推官的耐心。出错一次抽走一支，抽完就按原判结案。
han: 这小二说话吞吞吐吐。来人，上夹棍，看他还敢不敢含糊！
fu[shock]: 大人饶命！
@choice
- 「大人，用刑问出来的，未必是真话。」 -> t_stop
- 不作声 -> t_silent
@state fu idle
han: 阿福，把那晚听见的，原原本本说一遍。
@hint 证词里有一句是他听见的，有一句是他猜的。追问每一句，想想他睡觉的地方，头顶上是谁。
@checkpoint
@trial r1

# t_stop
shen: 大人，用刑问出来的，未必是真话。孙敬那份供状，就是这么来的。
han: 哼，随你。

# t_silent
@set tortured
（衙役拿着夹棍上前。）
fu[shock]: 是账房！就是账房！小的看见了！小的亲眼看见了！
fu[sad]: ……不、不是……小的没看见……小的害怕……
han: 浪费本官的时间。
@penalty
fan: （在角落里小声）你看，夹棍底下出不了真话。

# r1p1
shen: 你睡在前堂，四周安静吗？
fu: 安静？哪儿能啊！账房先生的屋子就在小的头顶上，他那呼噜，打雷似的，天天吵得小的睡不着！
fu: 那晚也是，从小的躺下，就在头顶上轰隆轰隆的……
@stmt r1 k1 k1b r1p1b 那晚小的在前堂打地铺。头顶上账房先生的呼噜，从小的躺下就一直响着。
sys: 证词更新了。
# r1p1b
fu: 真的！小的数着呼噜都睡不着！
# r1p2
fu: 吵得挺凶的，小的不敢去看……掌柜骂起人来可凶了。
# r1p3
shen: 你看见是账房先生了？
fu: 没、没看见……可除了账房先生，还能有谁？白天他俩就吵过架！
# r1p4
fu: 小的胆小，捂着耳朵就睡了……
# r1p5
fu: 账房先生满手是血，刀就在他手里！小的看得真真的！

# r1_dao
fu: 对呀，就是这把刀！
han: 这能说明什么？孙敬拿着刀，本来就是阿福说的。
@penalty
# r1_sun
shen: 孙敬说，他那晚喝醉了，天没黑透就睡了。
han: 犯人自己的话，能作数？拿点实在的东西出来。
@penalty
# wrong1
@fx shake
fu: 啊？这、这跟小的说的有什么关系？
han: 沈检法，别浪费本官的时间。
@penalty

# r1ok
shen: 阿福，账房先生睡觉打呼噜，你每晚都嫌吵，对不对？
fu: 对、对呀。那晚也是……
@show pingmian
@state shen point
@fx slam
shen: 账房先生的卧房在前堂楼上，后厨在另一头。他在楼上打呼噜，同一时刻，怎么会在后厨跟掌柜吵架？
@state shen idle
fu[shock]: 对……对啊！那会儿呼噜一直在响……那吵架的是谁？
@state fu idle
han: ……那你说，跟掌柜吵架的是谁？
fu: 小的……小的不知道……那声音……有点像周四爷……
fu: 可是不对呀，四爷戌时就走了，小的亲眼看着他撑伞出的门！
@chars shen@L han@C zhou@R
zhou: 小福子，话可不能乱说。
han: 周四郎，你说说那晚。
zhou: 大人，草民问心无愧。
@hint 他说一路撑伞回家。那他的伞，后来在哪儿？
@checkpoint
@trial r2

# r2p1
zhou: 钱兄那晚兴致好，可草民铺子里有事，不便久留。
# r2p2
zhou: 阿福那孩子眼神好着呢，大人尽管问他。
# r2p3
shen: 一路都撑着伞？
zhou: 那么大的雨，不撑伞还能淋着？自然是撑着伞，一路到家。
# r2p3b
shen: 白天落下的？
zhou: 是啊，那天中午去对账，走时忘了拿。这有什么稀奇。
# r2p4
zhou: 老仆跟了草民二十年，不会说谎。
# r2_pu
shen: 你家老仆说，你那晚回家时浑身湿透，没打伞。
zhou: 老人家眼花，记错了。
sys: 这说明他在撒谎，可还不足以驳倒他。他说一路撑着伞，那伞呢？
# r2_jilu
shen: 初勘记录写着，那天早上柴房里的伞还是湿的。
zhou: 湿就湿了，柴房漏雨也说不定。
sys: 光说伞湿还不够。那天白天的天气，谁最清楚？
# wrong2
@fx shake
zhou: 大人，这位检法官是在胡乱攀扯。
han: 沈检法！
@penalty

# r2a
@show san
@state shen point
@fx slam
shen: 你说一路撑伞回家。那么这把伞，为什么第二天一早，立在清风楼后院的柴房里？
@state shen idle
@state zhou shock
zhou: ……
@state zhou idle
zhou: 那是草民白天落下的。那天中午去清风楼对账，把伞忘在那儿了。
@stmt r2 k3 k3b r2p3b 那把伞，是草民那天白天去清风楼时落下的。
sys: 证词更新了。
@hint 那天白天是什么天气？伞被发现时，又是什么样子？
@trial r2 3

# r2ok
shen: 更夫老钟说，那天白天晴了一整天，酉时一刻才下雨。
@show gengfu
shen: 初勘记录写得清清楚楚，第二天一早，柴房里那把伞，伞面还是湿的。
@state shen point
@fx slam
shen: 白天落下的伞，那天白天一滴雨都没淋过，怎么会湿？这把伞是在雨里撑过的。下雨以后，你撑着它离开了清风楼，又撑着它回来过！
@state shen idle
@state zhou shock
han: 周四郎，你还有什么话说？
@state zhou idle
zhou: ……好，草民认了。草民是回去过。
zhou: 草民走到半路，想起借据的事还没跟钱兄说完，就折回去了。可那又怎样？草民说完话就走了，走的时候，钱兄还好好的！
@hint 他说钱掌柜送他出了后门。第二天早上，后门是什么样子？他说凶手是账房，钱掌柜到底是怎么死的？
@checkpoint
@trial r3

# r3p1
shen: 钱掌柜答应宽限，那借据呢？
zhou: 钱兄……当着草民的面撕了。说兄弟之间不必如此。
# r3p2
zhou: 钱兄送草民到后门，草民走了，他关门回去。
# r3p3
zhou: 伞落在柴房里，雨又大，借件蓑衣，这有什么不对？
# r3p4
zhou: 大人，凶器、血衣、人证，样样都指着那个账房！
# r3p5
zhou: 拿不出来，就别血口喷人！
# r3_jieju
shen: 撕了？那你家灶膛里烧剩的这一片，“……百贯……九月十五”，又是什么？
@state zhou shock
zhou: ……草民记错了，是草民自己拿回去烧的。钱兄给我的。
@state zhou idle
han: 周四郎，你的话一改再改。
sys: 他又改口了。可光凭这一点，还定不了他的罪。
# wrong3
@fx shake
zhou: 大人明鉴，这东西和草民说的有什么相干？
han: 沈检法！本官的耐心是有数的。
@penalty

# r3_door
@if r3_door r3_dup
shen: 你说钱掌柜送你到后门，看着你走，然后关门回去。
@show menshuan
shen: 那他关了门，为什么不闩？阿福每晚都闩后门，那晚也闩了。第二天一早，门闩却是拔开的。
@state shen point
@fx slam
shen: 钱掌柜若是送你出门，一定会把门闩回去。门闩没回去，是因为你走的时候，已经没有人能闩门了！
@state shen idle
@state zhou shock
@set r3_door
@if r3_wound r3c
@state zhou idle
zhou: 门闩……兴许是钱兄自己忘了！钱兄是被刀捅死的，刀在账房手里！
@trial r3 4

# r3_wound
@if r3_wound r3_dup
shen: 樊仵作，请把重验的结果念给大人听。
@enter fan@CR
fan: 死者胸口那一刀，皮肉不卷，没有血荫，是人死了以后才砍的。
fan: 要命的伤在后脑，圆的，一寸半，从背后砸的。凶器是清风楼大秤的秤砣，在后厨水缸底下捞出来的，大小跟伤口一模一样。
@exit fan
@state shen point
@fx slam
shen: 孙敬拔出来的那把刀，砍下去的时候，钱掌柜已经死了。真正杀死他的，是这枚秤砣。补那一刀，是要让人去怀疑白天跟掌柜吵过架的账房。
@state shen idle
@state zhou shock
@set r3_wound
@if r3_door r3c
@state zhou idle
zhou: 就算是秤砣……草民走的时候，钱兄还好好的，后门是他亲自送草民出去的！
@trial r3 2

# r3_dup
shen: （这一点已经驳过了，得找他话里别的破绽。）
@trial r3

# r3_suoyi
@if r3_both r3final
shen: （蓑衣是最后的杀手锏。得先把他的退路一条条堵上：后门是怎么回事，钱掌柜又是怎么死的。）
@trial r3 3

# r3c
@set r3_both
@state zhou idle
zhou: 秤砣……秤砣谁都拿得到！阿福拿得到，账房也拿得到！你凭什么说是我！
@stmt r3 + k5 r3p5 后厨谁都进得去，秤砣谁都拿得到。你没有一样东西能证明是草民！
sys: 证词更新了。
@hint 他刚才亲口说过，他借了店里的一样东西回家。那东西后来在哪儿找到的？
@trial r3 5

# r3final
shen: 你刚才说，你借了店里的蓑衣，冒雨回家。
@show suoyi
shen: 州桥桥桩上捞起来的。领口的红绳，阿福认得。
@enter fu@CR
fu: 是……是小的娘给的红绳！
@exit fu
shen: 雨淋在外面，血却在里面。只有一种人披上蓑衣，血会沾在里面：他身上的衣服，已经是血了。
shen: 你在后厨砸死了钱掌柜，补了一刀，取走借据。你满身是血，伞也顾不上拿，扯下后门的蓑衣遮住血衣，从后门逃走。过州桥时，你把蓑衣扔进了汴河。
@state shen point
shen: 周四郎，你自己说的，那件蓑衣你披过。
@fx reveal
@state shen idle
（良久。）
@kneel zhou on
zhou: ……我的船。
han: 什么？
zhou: 我的绸缎船，八月里在汴河口沉了。一船的货，全没了。铺子撑不下去，三百贯，我拿什么还……
zhou: 我回去求他，跪下求他。他说兄弟归兄弟，账归账，明天还不上，就去告官。
zhou: 我没想杀他。我只是想拿回借据。他转过身去，接着算他的账，好像我根本不在那儿一样……那秤砣就挂在手边……
zhou: ……就算我还了钱，青……那些人也不会放过我……
shen: 那些人？
zhou: ……
@fx ink off
@fx pozhan off
@state han slam
@fx slam
han: 周四郎谋杀钱大有，证据确凿，收监再审！孙敬……当堂开释！
@state han idle
@lq hide
@chars sun@L+kneel fu@R
（孙敬伏在地上，放声大哭。阿福冲过去扶他，自己也哭了。）
@goto epilogue

# gameover
@fx shake
han: 够了。三日已到，照原判。
@lq hide
@bg black
@chars
@title 九月二十一|孙敬问斩
@gameover

# epilogue
@checkpoint
@title 尾声|雨后
@bg dusk
@chars sun@L shen@C fu@R
sun: 沈大人……小人这条命，是您给的。
shen: 是你自己喊的那一声冤。你要是不喊，谁也救不了你。
fu: 大人，小的那天说是账房先生……都怪小的乱说。
shen: 你说你听见吵架，这是真的。你说是账房先生，这是你猜的。下次，把听见的和猜的分开说。
fu[nod]: 小的记住了！
@chars shen@L fan@R
@if tortured ep_t
fan: 书生，你那天要是不拦着，夹棍一上，小二什么都会招。
@goto ep2
# ep_t
fan: 你那天没拦着。看见了吧，夹棍一上，小二说他亲眼看见了。那句话要是写进卷宗，就是第二份屈打成招的供状。
@goto ep2
# ep2
shen: 屈打成招，孙敬已经吃过一回了。
fan: 嗯。手是干净了点，眼睛还行。
shen: 樊老这是在夸我？
fan: 我是说你下回验尸，别站那么远。
shen: 周四郎说“那些人不会放过他”。他话说到一半，说的是一个“青”字。
@show zhangbu
fan: 这虫子……我好像在哪儿见过。
shen: 哪里？
fan: 想不起来了。老了。走吧，书生，请我喝一壶。
@title 第一章|雨夜酒楼　完
@end
`;
})();
