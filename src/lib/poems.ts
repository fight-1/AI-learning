// 古文古诗数据集：供 bg.js 的 guwen 模式按皮肤读取，整首竖排悬浮。
// 新增/调整内容只需改这里；控制台与战甲面板后续可扩展「诗单」选择。

export interface Poem {
  title: string;
  author: string;
  dynasty?: string;
  lines: string[];
  tag?: string;
}

export const POEMS: Record<string, Poem[]> = {
  // 古风·墨剑江湖：江湖、侠气、山水、禅意
  ink: [
    { title: '道德经', author: '老子', dynasty: '春秋', lines: ['道可道', '非常道', '名可名', '非常名'] },
    { title: '道德经', author: '老子', dynasty: '春秋', lines: ['上善若水', '水善利万物', '而不争'] },
    { title: '山居秋暝', author: '王维', dynasty: '唐', lines: ['空山新雨后', '天气晚来秋', '明月松间照', '清泉石上流'] },
    { title: '侠客行', author: '李白', dynasty: '唐', lines: ['十步杀一人', '千里不留行', '事了拂衣去', '深藏身与名'] },
    { title: '江雪', author: '柳宗元', dynasty: '唐', lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'] },
    { title: '饮酒', author: '陶渊明', dynasty: '东晋', lines: ['采菊东篱下', '悠然见南山'] },
    { title: '青玉案', author: '辛弃疾', dynasty: '宋', lines: ['众里寻他', '千百度', '蓦然回首', '那人却在', '灯火阑珊处'] },
    { title: '逍遥游', author: '庄子', dynasty: '战国', lines: ['北冥有鱼', '其名为鲲', '鲲之大', '不知其几千里也'] },
    { title: '念奴娇', author: '苏轼', dynasty: '宋', lines: ['大江东去', '浪淘尽', '千古风流人物'] },
  ],
  // 玄幻·灵蕴修真：仙、道、羽化登仙
  xianxia: [
    { title: '道德经', author: '老子', dynasty: '春秋', lines: ['道生一', '一生二', '二生三', '三生万物'] },
    { title: '水调歌头', author: '苏轼', dynasty: '宋', lines: ['明月几时有', '把酒问青天'] },
    { title: '梦游天姥', author: '李白', dynasty: '唐', lines: ['霓为衣兮', '风为马', '云之君兮', '纷纷而来下'] },
    { title: '古风', author: '李白', dynasty: '唐', lines: ['素手把芙蓉', '虚步蹑太清'] },
    { title: '远游', author: '屈原', dynasty: '战国', lines: ['仍羽人于丹丘', '留不死之旧乡'] },
    { title: '绝句', author: '吕洞宾', dynasty: '唐', lines: ['朝游北海', '暮苍梧'] },
  ],
};
