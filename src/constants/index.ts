import categoryManagersData from '../data/categoryManagers.json';

export const CATEGORY_MANAGERS_MAP: Record<string, string> = categoryManagersData as Record<string, string>;

export const MANAGERS_DICT: Record<string, string> = {
  '4': 'Волчек',
  '5': 'Милевская',
  '6': 'Кононова',
  '10': 'Синковец',
  '11': 'Кремень',
  '14': 'Гиль',
  '17': 'Кочетков',
  '27': 'Евтух',
  '31': 'Ополько',
  '32': 'Грудина',
  '34': 'Барташевич',
  '35': 'Кожедуб',
  '37': 'Черток',
};

export interface ManagerInfo {
  code: string;
  name: string;
}

export const MANAGERS_LIST: ManagerInfo[] = [
  { code: '4', name: 'Волчек' },
  { code: '5', name: 'Милевская' },
  { code: '6', name: 'Кононова' },
  { code: '10', name: 'Синковец' },
  { code: '11', name: 'Кремень' },
  { code: '14', name: 'Гиль' },
  { code: '17', name: 'Кочетков' },
  { code: '27', name: 'Евтух' },
  { code: '31', name: 'Ополько' },
  { code: '32', name: 'Грудина' },
  { code: '34', name: 'Барташевич' },
  { code: '35', name: 'Кожедуб' },
  { code: '37', name: 'Черток' },
];

/**
 * Resolves 3-level category hierarchy (Group 1 / Group 2) from Group 3
 */
export function getCategoryHierarchy(group3: string): { group1: string; group2: string } {
  if (!group3) return { group1: 'Каталог товаров', group2: 'Общие товары' };
  const s = group3.toLowerCase().trim();

  // 1. Освещение (Волчек / 4)
  if (
    s.includes('свет') ||
    s.includes('люстр') ||
    s.includes('бра') ||
    s.includes('подвес') ||
    s.includes('спот') ||
    s.includes('торшер') ||
    s.includes('треков') ||
    s.includes('ночник') ||
    s.includes('гирлянд') ||
    s.includes('лампа') ||
    s.includes('лампы') ||
    s.includes('фонар') ||
    s.includes('плафон') ||
    s.includes('подсветк') ||
    s.includes('абажур') ||
    s.includes('иллюминац') ||
    s.includes('шинопровод') ||
    s.includes('прожектор') ||
    s.includes('освещен')
  ) {
    let g2 = 'Люстры и потолочные светильники';
    if (s.includes('бра') || s.includes('настенн') || s.includes('спот')) g2 = 'Настенно-потолочные светильники и споты';
    else if (s.includes('торшер') || s.includes('настольн') || s.includes('ночник')) g2 = 'Настольные лампы и торшеры';
    else if (s.includes('лампа') || s.includes('лампы') || s.includes('цокол')) g2 = 'Лампочки и источники света';
    else if (s.includes('уличн') || s.includes('прожектор') || s.includes('садово-парков')) g2 = 'Уличное и садово-парковое освещение';
    else if (s.includes('лент') || s.includes('led') || s.includes('профили для лент') || s.includes('блок питан')) g2 = 'Светодиодные ленты и компоненты';
    else if (s.includes('треков') || s.includes('шин')) g2 = 'Трековые системы освещения';
    else if (s.includes('гирлянд') || s.includes('новогод') || s.includes('декоративн')) g2 = 'Праздничная иллюминация и гирлянды';
    return { group1: 'Освещение', group2: g2 };
  }

  // 2. Электротовары (Кононова / 6)
  if (
    s.includes('электр') ||
    s.includes('кабел') ||
    s.includes('провод') ||
    s.includes('разъем') ||
    s.includes('патч') ||
    s.includes('розетк') ||
    s.includes('выключател') ||
    s.includes('щит') ||
    s.includes('автомат') ||
    s.includes('вилка') ||
    s.includes('удлинител') ||
    s.includes('соедин') ||
    s.includes('аудио') ||
    s.includes('видео') ||
    s.includes('бокс') ||
    s.includes('клемм') ||
    s.includes('гофр') ||
    s.includes('канал') ||
    s.includes('датчик') ||
    s.includes('звонок') ||
    s.includes('стабилизатор') ||
    s.includes('трансформатор') ||
    s.includes('элемент питан') ||
    s.includes('батарейк') ||
    s.includes('аккумулятор') ||
    s.includes('зарядн') ||
    s.includes('сетев') ||
    s.includes('реле') ||
    s.includes('адаптер')
  ) {
    let g2 = 'Кабельно-проводниковая продукция';
    if (s.includes('розетк') || s.includes('выключател') || s.includes('рамк') || s.includes('диммер')) g2 = 'Розетки, выключатели и рамки';
    else if (s.includes('щит') || s.includes('автомат') || s.includes('узо') || s.includes('бокс') || s.includes('рубильник') || s.includes('реле')) g2 = 'Низковольтное оборудование и щиты';
    else if (s.includes('патч') || s.includes('разъем') || s.includes('аудио') || s.includes('видео') || s.includes('сетев') || s.includes('тв') || s.includes('tv') || s.includes('адаптер')) g2 = 'Сетевые и мультимедийные разъемы';
    else if (s.includes('удлинител') || s.includes('колодк') || s.includes('сетевой фильтр') || s.includes('вилка') || s.includes('переходник')) g2 = 'Удлинители, фильтры и вилки';
    else if (s.includes('канал') || s.includes('гофр') || s.includes('труба гофрир') || s.includes('металлорукав')) g2 = 'Кабель-каналы и системы прокладки';
    else if (s.includes('батарейк') || s.includes('аккумулятор') || s.includes('зарядн') || s.includes('элемент питан')) g2 = 'Элементы питания и зарядные устройства';
    return { group1: 'Электротовары', group2: g2 };
  }

  // 3. Инструменты и оборудование (Кремень / 11)
  if (
    s.includes('инструмент') ||
    s.includes('нивелир') ||
    s.includes('уровен') ||
    s.includes('уровн') ||
    s.includes('рулетк') ||
    s.includes('дальномер') ||
    s.includes('сварк') ||
    s.includes('пилы') ||
    s.includes('пила') ||
    s.includes('пильн') ||
    s.includes('верстак') ||
    s.includes('дрель') ||
    s.includes('дрели') ||
    s.includes('шуруповерт') ||
    s.includes('молоток') ||
    s.includes('молотки') ||
    s.includes('кувалд') ||
    s.includes('киянк') ||
    s.includes('лом') ||
    s.includes('монтировк') ||
    s.includes('отвертк') ||
    s.includes('ключ') ||
    s.includes('плоскогубц') ||
    s.includes('стремянк') ||
    s.includes('лестниц') ||
    s.includes('ящик для инстр') ||
    s.includes('сверл') ||
    s.includes('диск') ||
    s.includes('набор инстр') ||
    s.includes('горелк') ||
    s.includes('пылесос') ||
    s.includes('станок') ||
    s.includes('станки') ||
    s.includes('тиски') ||
    s.includes('лобзик') ||
    s.includes('перфоратор') ||
    s.includes('шлиф') ||
    s.includes('болгарк') ||
    s.includes('кусачк') ||
    s.includes('паяльник') ||
    s.includes('клещ') ||
    s.includes('струбцин') ||
    s.includes('штанген') ||
    s.includes('топор') ||
    s.includes('ножовк') ||
    s.includes('напильник') ||
    s.includes('зубил') ||
    s.includes('коронк') ||
    s.includes('фрез') ||
    s.includes('биты') ||
    s.includes('патрон') ||
    s.includes('пневмо') ||
    s.includes('компрессор') ||
    s.includes('генератор') ||
    s.includes('мойка высок') ||
    s.includes('краскопульт') ||
    s.includes('степлер') ||
    s.includes('нож') ||
    s.includes('мультиметр') ||
    s.includes('тестер') ||
    s.includes('линейк') ||
    s.includes('угломер') ||
    s.includes('штроборез') ||
    s.includes('миксер') ||
    s.includes('заклепочник') ||
    s.includes('гравер') ||
    s.includes('сабельн') ||
    s.includes('стусл') ||
    s.includes('фен') ||
    s.includes('полировальн') ||
    s.includes('терк') ||
    s.includes('сварочн') ||
    s.includes('клеев') ||
    s.includes('стержн')
  ) {
    let g2 = 'Ручной слесарно-монтажный инструмент';
    if (s.includes('нивелир') || s.includes('уровен') || s.includes('уровн') || s.includes('рулетк') || s.includes('дальномер') || s.includes('штанген') || s.includes('угломер') || s.includes('измерител') || s.includes('мультиметр') || s.includes('тестер') || s.includes('линейк')) g2 = 'Измерительный инструмент и приборы';
    else if (s.includes('дрель') || s.includes('дрели') || s.includes('перфоратор') || s.includes('шуруповерт') || s.includes('шлиф') || s.includes('болгарк') || s.includes('лобзик') || s.includes('пила') || s.includes('пилы') || s.includes('станок') || s.includes('станки') || s.includes('штроборез') || s.includes('миксер') || s.includes('гравер') || s.includes('фен') || s.includes('полировальн')) g2 = 'Электроинструмент и станки';
    else if (s.includes('сварк') || s.includes('сварочн') || s.includes('горелк') || s.includes('паяльник') || s.includes('маски')) g2 = 'Сварочное и паяльное оборудование';
    else if (s.includes('стремянк') || s.includes('лестниц') || s.includes('вышк') || s.includes('леса')) g2 = 'Лестницы, стремянки и вышки';
    else if (s.includes('сверл') || s.includes('диск') || s.includes('бур') || s.includes('коронк') || s.includes('фрез') || s.includes('биты') || s.includes('оснастк') || s.includes('сабельн') || s.includes('стержн')) g2 = 'Расходные материалы и оснастка';
    else if (s.includes('ящик') || s.includes('сумк') || s.includes('органайзер') || s.includes('пояс')) g2 = 'Хранение и транспортировка инструмента';
    return { group1: 'Инструменты и оборудование', group2: g2 };
  }

  // 4. Двери, замки и фурнитура (Синковец / 10)
  if (
    s.includes('двер') ||
    s.includes('замок') ||
    s.includes('замки') ||
    s.includes('ручк') ||
    s.includes('петл') ||
    s.includes('фурнитур') ||
    s.includes('кронштейн') ||
    s.includes('направляющ') ||
    s.includes('подъемник') ||
    s.includes('колес') ||
    s.includes('доводчик') ||
    s.includes('глазок') ||
    s.includes('уплотнител') ||
    s.includes('крючк') ||
    s.includes('упор') ||
    s.includes('защелк') ||
    s.includes('задвижк') ||
    s.includes('шпингалет') ||
    s.includes('навес') ||
    s.includes('запор') ||
    s.includes('ролик') ||
    s.includes('заглушк') ||
    s.includes('цилиндров') ||
    s.includes('креплен')
  ) {
    let g2 = 'Дверная фурнитура и аксессуары';
    if (s.includes('межкомнатн') || s.includes('входн') || s.includes('полотно') || s.includes('коробк') || s.includes('наличник') || s.includes('добор')) g2 = 'Двери межкомнатные и входные';
    else if (s.includes('замок') || s.includes('замки') || s.includes('цилиндр') || s.includes('личинк') || s.includes('сердцевин')) g2 = 'Замки, цилиндры и безопасность';
    else if (s.includes('кронштейн') || s.includes('направляющ') || s.includes('подъемник') || s.includes('мебельн') || s.includes('крючк') || s.includes('колес') || s.includes('опор')) g2 = 'Мебельная фурнитура и направляющие';
    return { group1: 'Двери и фурнитура', group2: g2 };
  }

  // 5. Краски, лаки и отделка (Милевская / 5)
  if (
    s.includes('краск') ||
    s.includes('грунт') ||
    s.includes('лак') ||
    s.includes('эмал') ||
    s.includes('мастик') ||
    s.includes('обои') ||
    s.includes('клей') ||
    s.includes('клеи') ||
    s.includes('шпатлевк') ||
    s.includes('герметик') ||
    s.includes('пена') ||
    s.includes('растворител') ||
    s.includes('колер') ||
    s.includes('антисептик') ||
    s.includes('масло') ||
    s.includes('воск') ||
    s.includes('пропитк') ||
    s.includes('валик') ||
    s.includes('кист') ||
    s.includes('шпател') ||
    s.includes('лента маляр') ||
    s.includes('малярн') ||
    s.includes('серпян') ||
    s.includes('стеклохолст') ||
    s.includes('фотообои') ||
    s.includes('пленка самокле') ||
    s.includes('красител') ||
    s.includes('пигмент') ||
    s.includes('очистител') ||
    s.includes('обезжиривател') ||
    s.includes('удалител') ||
    s.includes('емкости для раствор')
  ) {
    let g2 = 'Краски, эмали и лаки';
    if (s.includes('обои') || s.includes('фотообои') || s.includes('стеклохолст') || s.includes('пленка самокле')) g2 = 'Обои и настенные покрытия';
    else if (s.includes('грунт') || s.includes('пропитк') || s.includes('антисептик') || s.includes('шпатлевк') || s.includes('красител') || s.includes('пигмент')) g2 = 'Грунтовки, пропитки и колеры';
    else if (s.includes('клей') || s.includes('клеи') || s.includes('герметик') || s.includes('пена') || s.includes('мастик')) g2 = 'Клеи, герметики и монтажные пены';
    else if (s.includes('валик') || s.includes('кист') || s.includes('ванночк') || s.includes('шпател') || s.includes('малярн') || s.includes('лент') || s.includes('емкост')) g2 = 'Малярный и штукатурный инструмент';
    else if (s.includes('очистител') || s.includes('обезжиривател') || s.includes('удалител') || s.includes('растворител')) g2 = 'Растворители и очистители';
    return { group1: 'Краски и отделочные материалы', group2: g2 };
  }

  // 6. Сантехника, отопление и климат (Кочетков / 17)
  if (
    s.includes('сантех') ||
    s.includes('водонагреват') ||
    s.includes('ванн') ||
    s.includes('смесител') ||
    s.includes('душ') ||
    s.includes('карниз для ванн') ||
    s.includes('унитаз') ||
    s.includes('раковин') ||
    s.includes('мойк') ||
    s.includes('сифон') ||
    s.includes('трап') ||
    s.includes('полотенцесушител') ||
    s.includes('радиатор') ||
    s.includes('котел') ||
    s.includes('фитинг') ||
    s.includes('шторки душев') ||
    s.includes('инсталляц') ||
    s.includes('биде') ||
    s.includes('подводк') ||
    s.includes('счетчик вод') ||
    s.includes('фильтр') ||
    s.includes('кран') ||
    s.includes('коллектор') ||
    s.includes('теплый пол') ||
    s.includes('терморегулятор') ||
    s.includes('вентиляц') ||
    s.includes('вентилятор') ||
    s.includes('вытяжк') ||
    s.includes('решетка') ||
    s.includes('американк') ||
    s.includes('ниппел') ||
    s.includes('переходник') ||
    s.includes('сгон') ||
    s.includes('бочонок') ||
    s.includes('футорк') ||
    s.includes('штуцер') ||
    s.includes('колено') ||
    s.includes('отвод') ||
    s.includes('обогреват')
  ) {
    let g2 = 'Санфаянс и мебель для ванной';
    if (s.includes('смесител') || s.includes('душ') || s.includes('лейк') || s.includes('гарнитур') || s.includes('стойк')) g2 = 'Смесители и душевые системы';
    else if (s.includes('ванн') || s.includes('поддон') || s.includes('шторки душев') || s.includes('карниз для ванн')) g2 = 'Ванны, душевые кабины и шторки';
    else if (s.includes('водонагреват') || s.includes('котел') || s.includes('бойлер') || s.includes('радиатор') || s.includes('полотенцесушител') || s.includes('отоплен') || s.includes('обогреват')) g2 = 'Отопление и водонагреватели';
    else if (s.includes('труб') || s.includes('фитинг') || s.includes('сифон') || s.includes('трап') || s.includes('кран') || s.includes('подводк') || s.includes('инсталляц') || s.includes('американк') || s.includes('ниппел') || s.includes('сгон') || s.includes('футорк') || s.includes('штуцер') || s.includes('колено') || s.includes('отвод') || s.includes('фильтр')) g2 = 'Инженерная сантехника и фитинги';
    else if (s.includes('вентиляц') || s.includes('вентилятор') || s.includes('вытяжк') || s.includes('воздуховод') || s.includes('решетка')) g2 = 'Вентиляция и воздуховоды';
    return { group1: 'Сантехника и климат', group2: g2 };
  }

  // 7. Плитка и строительные смеси (Евтух / 27)
  if (
    s.includes('плитк') ||
    s.includes('керамогранит') ||
    s.includes('свп') ||
    s.includes('смеси') ||
    s.includes('цемент') ||
    s.includes('штукатур') ||
    s.includes('затирк') ||
    s.includes('мозаик') ||
    s.includes('стяжк') ||
    s.includes('наливн') ||
    s.includes('пескобетон') ||
    s.includes('гипс') ||
    s.includes('алебастр') ||
    s.includes('кладочн') ||
    s.includes('крестик для плитк') ||
    s.includes('фуг') ||
    s.includes('клинкер')
  ) {
    let g2 = 'Керамическая плитка и керамогранит';
    if (s.includes('свп') || s.includes('крестик') || s.includes('профиль для плитк') || s.includes('уголок для плитк')) g2 = 'Системы выравнивания и профили для плитки';
    else if (s.includes('смеси') || s.includes('цемент') || s.includes('штукатур') || s.includes('стяжк') || s.includes('пескобетон')) g2 = 'Сухие строительные смеси';
    else if (s.includes('затирк') || s.includes('фуг')) g2 = 'Затирки и фуги для швов';
    else if (s.includes('клинкер') || s.includes('мозаик')) g2 = 'Клинкер и фасадная плитка';
    return { group1: 'Плитка и смеси', group2: g2 };
  }

  // 8. Напольные покрытия (Барташевич / 34)
  if (
    s.includes('ламинат') ||
    s.includes('плинтус') ||
    s.includes('порог') ||
    s.includes('линолеум') ||
    s.includes('паркет') ||
    s.includes('подложк') ||
    s.includes('пвх') ||
    s.includes('кварцвинил') ||
    s.includes('багет') ||
    s.includes('пробков') ||
    s.includes('ковролин') ||
    s.includes('террасн') ||
    s.includes('напольные покрытия')
  ) {
    let g2 = 'Ламинат и паркетная доска';
    if (s.includes('плинтус') || s.includes('порог') || s.includes('багет') || s.includes('подложк') || s.includes('стык')) g2 = 'Плинтусы, пороги и подложка';
    else if (s.includes('линолеум') || s.includes('пвх') || s.includes('кварцвинил') || s.includes('плитка пвх')) g2 = 'Линолеум и кварцвинил';
    else if (s.includes('ковролин')) g2 = 'Ковролин и рулонные покрытия';
    return { group1: 'Напольные покрытия', group2: g2 };
  }

  // 9. Ковры и текстиль (Ополько / 31)
  if (
    s.includes('ковер') ||
    s.includes('ковр') ||
    s.includes('дорожк') ||
    s.includes('палас') ||
    s.includes('подуш') ||
    s.includes('одеял') ||
    s.includes('плед') ||
    s.includes('штор') ||
    s.includes('жалюзи') ||
    s.includes('рулонн') ||
    s.includes('карниз') ||
    s.includes('скатерть') ||
    s.includes('полотенц') ||
    s.includes('постельн') ||
    s.includes('текстил') ||
    s.includes('покрывал') ||
    s.includes('шкур')
  ) {
    let g2 = 'Ковры и ковровые дорожки';
    if (s.includes('штор') || s.includes('жалюзи') || s.includes('рулонн') || s.includes('гардин')) g2 = 'Шторы, жалюзи и рулонные шторы';
    else if (s.includes('карниз') || s.includes('кронштейн для карниз')) g2 = 'Карнизы для штор и аксессуары';
    else if (s.includes('подуш') || s.includes('одеял') || s.includes('плед') || s.includes('постельн') || s.includes('покрывал') || s.includes('полотенц')) g2 = 'Постельные принадлежности и пледы';
    else if (s.includes('шкур')) g2 = 'Декоративные шкуры и накидки';
    return { group1: 'Ковры и текстиль', group2: g2 };
  }

  // 10. Сад и отдых (Грудина / 32)
  if (
    s.includes('сад') ||
    s.includes('растен') ||
    s.includes('семен') ||
    s.includes('горшок') ||
    s.includes('горшки') ||
    s.includes('кашпо') ||
    s.includes('рассад') ||
    s.includes('луковиц') ||
    s.includes('полив') ||
    s.includes('шланг') ||
    s.includes('газон') ||
    s.includes('мангал') ||
    s.includes('гриль') ||
    s.includes('грил') ||
    s.includes('кресла подвесн') ||
    s.includes('шезлонг') ||
    s.includes('удобрен') ||
    s.includes('грунт для') ||
    s.includes('саженц') ||
    s.includes('лопат') ||
    s.includes('грабл') ||
    s.includes('секатор') ||
    s.includes('опрыскивател') ||
    s.includes('парник') ||
    s.includes('теплиц') ||
    s.includes('забор') ||
    s.includes('огражд') ||
    s.includes('ящики балкон') ||
    s.includes('фонтан') ||
    s.includes('бассейн') ||
    s.includes('газонокосилк') ||
    s.includes('триммер') ||
    s.includes('культиватор') ||
    s.includes('уголь') ||
    s.includes('дрова') ||
    s.includes('севок') ||
    s.includes('корневищ') ||
    s.includes('насос') ||
    s.includes('воздуходувк') ||
    s.includes('мотобур') ||
    s.includes('параметров почвы') ||
    s.includes('субстрат') ||
    s.includes('дренаж') ||
    s.includes('оросител') ||
    s.includes('распылител') ||
    s.includes('компост') ||
    s.includes('стимулятор') ||
    s.includes('кусторез') ||
    s.includes('вил') ||
    s.includes('почвенн') ||
    s.includes('коптил') ||
    s.includes('щепа') ||
    s.includes('торф') ||
    s.includes('компостер') ||
    s.includes('емкости для вод') ||
    s.includes('гамак') ||
    s.includes('дровниц') ||
    s.includes('надувн')
  ) {
    let g2 = 'Растения, семена и луковицы';
    if (s.includes('горшок') || s.includes('горшки') || s.includes('кашпо') || s.includes('ящики балкон') || s.includes('поддон для цветов')) g2 = 'Цветочные горшки, кашпо и ящики';
    else if (s.includes('полив') || s.includes('шланг') || s.includes('насос') || s.includes('распылител') || s.includes('оросител') || s.includes('лейк')) g2 = 'Системы полива и насосы';
    else if (s.includes('лопат') || s.includes('грабл') || s.includes('секатор') || s.includes('опрыскивател') || s.includes('кусторез') || s.includes('вил') || s.includes('садовый инстр')) g2 = 'Садовый ручной инвентарь';
    else if (s.includes('мангал') || s.includes('гриль') || s.includes('грил') || s.includes('барбекю') || s.includes('кресла') || s.includes('шезлонг') || s.includes('качел') || s.includes('тент') || s.includes('гамак') || s.includes('коптил') || s.includes('дровниц')) g2 = 'Садовая мебель, отдых и барбекю';
    else if (s.includes('грунт') || s.includes('удобрен') || s.includes('торф') || s.includes('дренаж') || s.includes('субстрат') || s.includes('стимулятор') || s.includes('компост')) g2 = 'Грунты, торф и удобрения';
    else if (s.includes('надувн') || s.includes('бассейн')) g2 = 'Бассейны и надувная продукция';
    return { group1: 'Сад и отдых', group2: g2 };
  }

  // 11. Строительные материалы и крепеж (Кожедуб / 35)
  if (
    s.includes('профил') ||
    s.includes('лист') ||
    s.includes('изоляц') ||
    s.includes('кровл') ||
    s.includes('металл') ||
    s.includes('алюмин') ||
    s.includes('труб') ||
    s.includes('пленк') ||
    s.includes('мембран') ||
    s.includes('гипсокартон') ||
    s.includes('утеплител') ||
    s.includes('сайдинг') ||
    s.includes('шифер') ||
    s.includes('кирпич') ||
    s.includes('блок') ||
    s.includes('сетк') ||
    s.includes('арматур') ||
    s.includes('пенопласт') ||
    s.includes('рубероид') ||
    s.includes('ондулин') ||
    s.includes('черепиц') ||
    s.includes('водосток') ||
    s.includes('профнастил') ||
    s.includes('осб') ||
    s.includes('osb') ||
    s.includes('фанер') ||
    s.includes('дсп') ||
    s.includes('двп') ||
    s.includes('доск') ||
    s.includes('брус') ||
    s.includes('пиломатериал') ||
    s.includes('крепеж') ||
    s.includes('саморез') ||
    s.includes('дюбел') ||
    s.includes('анкер') ||
    s.includes('гвозд') ||
    s.includes('болт') ||
    s.includes('гайк') ||
    s.includes('шайб') ||
    s.includes('вата') ||
    s.includes('талреп') ||
    s.includes('такелаж') ||
    s.includes('коуш') ||
    s.includes('зажим') ||
    s.includes('плиты потолочн') ||
    s.includes('потолочн') ||
    s.includes('мдф') ||
    s.includes('камень') ||
    s.includes('планкен') ||
    s.includes('вагонк') ||
    s.includes('обшивк') ||
    s.includes('шуруп') ||
    s.includes('кляймер') ||
    s.includes('крюк') ||
    s.includes('хомут') ||
    s.includes('винт') ||
    s.includes('шпильк') ||
    s.includes('заклепк') ||
    s.includes('люк')
  ) {
    let g2 = 'Общестроительные и листовые материалы';
    if (s.includes('кровл') || s.includes('пленк') || s.includes('мембран') || s.includes('водосток') || s.includes('шифер') || s.includes('черепиц') || s.includes('рубероид')) g2 = 'Кровля, водосточные системы и изоляция';
    else if (s.includes('профил') || s.includes('гипсокартон') || s.includes('подвес для профил') || s.includes('маяк') || s.includes('плиты потолочн') || s.includes('потолочн')) g2 = 'Гипсокартонные системы и профили';
    else if (s.includes('утеплител') || s.includes('минват') || s.includes('пенополистирол') || s.includes('пенопласт') || s.includes('вата')) g2 = 'Тепло- и звукоизоляция';
    else if (s.includes('крепеж') || s.includes('саморез') || s.includes('дюбел') || s.includes('анкер') || s.includes('гвозд') || s.includes('болт') || s.includes('гайк') || s.includes('шуруп') || s.includes('кляймер') || s.includes('крюк') || s.includes('хомут') || s.includes('винт') || s.includes('шпильк') || s.includes('заклепк') || s.includes('талреп') || s.includes('такелаж') || s.includes('коуш') || s.includes('зажим')) g2 = 'Метизы, такелаж и крепеж';
    else if (s.includes('фанер') || s.includes('осб') || s.includes('osb') || s.includes('доск') || s.includes('брус') || s.includes('дсп') || s.includes('двп') || s.includes('мдф') || s.includes('планкен') || s.includes('вагонк')) g2 = 'Древесно-плитные материалы и вагонка';
    else if (s.includes('люк')) g2 = 'Ревизионные люки и двери';
    return { group1: 'Строительные материалы', group2: g2 };
  }

  // 12. Посуда и товары для кухни (Черток / 37)
  if (
    s.includes('посуд') ||
    s.includes('кружк') ||
    s.includes('чашк') ||
    s.includes('тарелк') ||
    s.includes('блюд') ||
    s.includes('бокал') ||
    s.includes('стакан') ||
    s.includes('кувшин') ||
    s.includes('графин') ||
    s.includes('стопк') ||
    s.includes('рюмк') ||
    s.includes('ложк') ||
    s.includes('вилки столов') ||
    s.includes('ножи кухон') ||
    s.includes('сливочник') ||
    s.includes('соусник') ||
    s.includes('масленк') ||
    s.includes('молочник') ||
    s.includes('кухн') ||
    s.includes('чай') ||
    s.includes('кофе') ||
    s.includes('кастрюл') ||
    s.includes('сковород') ||
    s.includes('сервиз')
  ) {
    let g2 = 'Столовая посуда и приборы';
    if (s.includes('бокал') || s.includes('стакан') || s.includes('стопк') || s.includes('рюмк') || s.includes('кувшин') || s.includes('графин')) g2 = 'Питьевое стекло и бокалы';
    else if (s.includes('чай') || s.includes('кофе') || s.includes('кружк') || s.includes('чашк') || s.includes('сервиз')) g2 = 'Чайная и кофейная посуда';
    else if (s.includes('кухн') || s.includes('кастрюл') || s.includes('сковород')) g2 = 'Кухонные принадлежности и аксессуары';
    return { group1: 'Посуда и товары для кухни', group2: g2 };
  }

  // 13. Товары для животных (Черток / 37)
  if (
    s.includes('животн') ||
    s.includes('зоо') ||
    s.includes('собак') ||
    s.includes('кошек') ||
    s.includes('кошк') ||
    s.includes('птиц') ||
    s.includes('грызун') ||
    s.includes('корм') ||
    s.includes('игрушки для животн') ||
    s.includes('аксессуары для животн') ||
    s.includes('поводок') ||
    s.includes('ошейник') ||
    s.includes('лежанк') ||
    s.includes('когтеточк') ||
    s.includes('лоток') ||
    s.includes('наполнитель') ||
    s.includes('наполнит') ||
    s.includes('туалет') ||
    s.includes('миск') ||
    s.includes('клетк') ||
    s.includes('аквариум') ||
    s.includes('уход')
  ) {
    let g2 = 'Аксессуары и уход за питомцами';
    if (s.includes('корм') || s.includes('лакомств') || s.includes('консерв')) g2 = 'Корма и питание для животных';
    else if (s.includes('игрушк')) g2 = 'Игрушки и развлечения для питомцев';
    else if (s.includes('лоток') || s.includes('наполнитель') || s.includes('наполнит') || s.includes('туалет') || s.includes('пеленк')) g2 = 'Гигиена и туалеты для животных';
    return { group1: 'Зоотовары', group2: g2 };
  }

  // 14. Мебель и интерьер (Гиль / 14)
  if (
    s.includes('мебел') ||
    s.includes('столешниц') ||
    s.includes('стеллаж') ||
    s.includes('шкаф') ||
    s.includes('стол') ||
    s.includes('стул') ||
    s.includes('полк') ||
    s.includes('зеркал') ||
    s.includes('картин') ||
    s.includes('рамы') ||
    s.includes('декор') ||
    s.includes('вешалк') ||
    s.includes('обувниц') ||
    s.includes('комод') ||
    s.includes('банкетк') ||
    s.includes('тумб') ||
    s.includes('короб') ||
    s.includes('корзин')
  ) {
    let g2 = 'Мебель и модульные системы';
    if (s.includes('столешниц') || s.includes('стеллаж') || s.includes('полк') || s.includes('шкаф') || s.includes('тумб')) g2 = 'Мебель, столешницы и стеллажи';
    else if (s.includes('зеркал') || s.includes('картин') || s.includes('рамы') || s.includes('декор') || s.includes('часы')) g2 = 'Декор интерьера и зеркала';
    else if (s.includes('вешалк') || s.includes('обувниц') || s.includes('короб') || s.includes('корзин')) g2 = 'Хранение вещей и порядок в доме';
    return { group1: 'Мебель и интерьер', group2: g2 };
  }

  // 15. Праздничный декор и подарки
  if (s.includes('новогод') || s.includes('елочн') || s.includes('шары') || s.includes('игрушки и украшен') || s.includes('подар')) {
    return { group1: 'Праздничный декор и подарки', group2: 'Новогодние товары и упаковка' };
  }

  // 16. Хозтовары и бытовая химия
  if (
    s.includes('хоз') ||
    s.includes('уборк') ||
    s.includes('губк') ||
    s.includes('тряпк') ||
    s.includes('пакет') ||
    s.includes('ведро') ||
    s.includes('ведра') ||
    s.includes('швабр') ||
    s.includes('перчатк') ||
    s.includes('стирк') ||
    s.includes('мыл') ||
    s.includes('чистящ') ||
    s.includes('моем') ||
    s.includes('химия') ||
    s.includes('контейнеры для отходов') ||
    s.includes('урны') ||
    s.includes('стеклоомывател') ||
    s.includes('спецодежд')
  ) {
    return { group1: 'Хозтовары и бытовая химия', group2: 'Товары для дома и уборки' };
  }

  return { group1: 'Каталог товаров', group2: 'Товары для дома и ремонта' };
}
export function getManagerForCategory(groupName: string): string {
  if (!groupName) return 'Волчек';
  const trimmed = groupName.trim();
  if (CATEGORY_MANAGERS_MAP[trimmed]) {
    return CATEGORY_MANAGERS_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const [cat, mgr] of Object.entries(CATEGORY_MANAGERS_MAP)) {
    if (cat.toLowerCase() === lower) return mgr;
  }

  // Свет, люстры, светильники -> Волчек (4)
  if (lower.includes('свет') || lower.includes('люстр') || lower.includes('бра') || lower.includes('подвес') || lower.includes('спот') || lower.includes('торшер') || lower.includes('треков')) {
    return 'Волчек';
  }
  // Электрика, кабель, разъемы, прожекторы -> Кононова (6)
  if (lower.includes('электр') || lower.includes('кабел') || lower.includes('разъем') || lower.includes('прожектор') || lower.includes('патч') || lower.includes('вилка') || lower.includes('розетк') || lower.includes('выключател')) {
    return 'Кононова';
  }
  // Инструмент, нивелиры, уровни, рулетки, крепеж -> Кремень (11)
  if (lower.includes('инструмент') || lower.includes('нивелир') || lower.includes('уровен') || lower.includes('рулетк') || lower.includes('дальномер') || lower.includes('сварк') || lower.includes('пилы') || lower.includes('верстак')) {
    return 'Кремень';
  }
  // Краски, лаки, грунты, обои, эмали -> Милевская (5)
  if (lower.includes('краск') || lower.includes('грунт') || lower.includes('лак') || lower.includes('эмал') || lower.includes('мастик') || lower.includes('обои') || lower.includes('клей')) {
    return 'Милевская';
  }
  // Двери, замки, фурнитура, ручки, кронштейны -> Синковец (10)
  if (lower.includes('двер') || lower.includes('замок') || lower.includes('замки') || lower.includes('ручк') || lower.includes('петл') || lower.includes('фурнитур') || lower.includes('кронштейн') || lower.includes('направляющ')) {
    return 'Синковец';
  }
  // Плитка, керамогранит, сухие смеси, цемент -> Евтух (27)
  if (lower.includes('плитк') || lower.includes('керамогранит') || lower.includes('свп') || lower.includes('смеси') || lower.includes('цемент') || lower.includes('штукатур')) {
    return 'Евтух';
  }
  // Сад, растения, семена, горшки, кашпо, рассада -> Грудина (32)
  if (lower.includes('сад') || lower.includes('растен') || lower.includes('семен') || lower.includes('горшок') || lower.includes('горшки') || lower.includes('кашпо') || lower.includes('рассад') || lower.includes('луковиц') || lower.includes('корм')) {
    return 'Грудина';
  }
  // Сантехника, водонагреватели, ванны, смесители, душевые -> Кочетков (17)
  if (lower.includes('сантех') || lower.includes('водонагреват') || lower.includes('ванн') || lower.includes('смесител') || lower.includes('душ') || lower.includes('карниз') || lower.includes('унитаз')) {
    return 'Кочетков';
  }
  // Ковры, ковровые дорожки, текстиль, подушки, пледы, одеяла -> Ополько (31)
  if (lower.includes('ковер') || lower.includes('ковр') || lower.includes('подуш') || lower.includes('одеял') || lower.includes('штор') || lower.includes('жалюзи') || lower.includes('плед')) {
    return 'Ополько';
  }
  // Напольные покрытия, ламинат, паркет, плинтусы, пороги -> Барташевич (34)
  if (lower.includes('ламинат') || lower.includes('плинтус') || lower.includes('порог') || lower.includes('линолеум') || lower.includes('паркет') || lower.includes('подложк')) {
    return 'Барташевич';
  }
  // Строительные материалы, профили, листы, изоляция, кровля -> Кожедуб (35)
  if (lower.includes('профил') || lower.includes('лист') || lower.includes('изоляц') || lower.includes('кровл') || lower.includes('металл') || lower.includes('алюмин') || lower.includes('труб')) {
    return 'Кожедуб';
  }
  // Товары для животных, зоотовары, хозяйственные -> Черток (37)
  if (lower.includes('животн') || lower.includes('зоо') || lower.includes('собак') || lower.includes('кошек') || lower.includes('птиц') || lower.includes('хоз')) {
    return 'Черток';
  }
  // Мебель, столешницы, стеллажи -> Гиль (14)
  if (lower.includes('мебел') || lower.includes('столешниц') || lower.includes('стеллаж') || lower.includes('шкаф') || lower.includes('стол') || lower.includes('стул')) {
    return 'Гиль';
  }

  return 'Волчек';
}

export const MONTH_NAMES: Record<number, string> = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
};

export const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=59376984#gid=59376984';
export const KAM_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=183144046#gid=183144046';
export const GROUPS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1LABW3U4TdX6cDjps_g_mBBsWRW8_Xx7W8LqBZB4CO2g/edit?gid=0#gid=0';
export const SITE_ORDER_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1LABW3U4TdX6cDjps_g_mBBsWRW8_Xx7W8LqBZB4CO2g/edit?gid=442661295#gid=442661295';
export const TASKS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=1482592400#gid=1482592400';
export const NEW_PRODUCTS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=413377182#gid=413377182';
export const CONTACTS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=1825148105#gid=1825148105';
export const MANAGERS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=1474629181#gid=1474629181';
export const WORKING_GROUPS_CONTENT_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=33531424#gid=33531424';
export const WORKING_GROUPS_KAM_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=1367779997#gid=1367779997';
export const PROPERTIES_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1hV2tBPZDxlEvkXYrzo9rsS40MuJ_eMQbzWr9WQRgytw/edit?gid=0#gid=0';

export const INITIAL_MATERIK_STATUS: Record<string, string> = {
  'интерьерный свет': '1',
  'уличные светильники': '1',
  'трековые системы': '1',
  'светодиодные ленты': '1',
  'электроустановочные изделия': '0',
  'люстры и подвесы': '1',
  'настольные лампы': '1',
  'бра и подсветка': '1',
  'споты': '1',
  'прожекторы': '1',
  'лампочки': '1',
};

export const INITIAL_PALAS_STATUS: Record<string, string> = {
  'интерьерный свет': '1',
  'уличные светильники': '0',
  'трековые системы': '1',
  'светодиодные ленты': '1',
  'электроустановочные изделия': '0',
  'люстры и подвесы': '1',
  'настольные лампы': '0',
  'бра и подсветка': '1',
  'споты': '0',
  'прожекторы': '0',
  'лампочки': '1',
};

/**
 * Calculates working/business days (Monday-Friday) between a given date string (e.g. "DD.MM.YYYY" or "DD.MM.YYYY HH:MM:SS") and today.
 */
export function calculateBusinessDays(dateStr: string): number {
  if (!dateStr || dateStr.trim() === '' || dateStr.toLowerCase() === 'nan' || dateStr.toLowerCase() === 'none') {
    return 0;
  }
  try {
    const cleanDate = dateStr.split(' ')[0];
    const parts = cleanDate.split('.');
    if (parts.length < 3) return 0;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const startDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || startDate >= today) {
      return 0;
    }

    let count = 0;
    const cur = new Date(startDate);
    cur.setDate(cur.getDate() + 1);

    while (cur <= today) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Formats current date and time into "DD.MM.YYYY HH:MM:SS" or "DD.MM.YYYY HH:MM"
 */
export function formatCurrentDate(withSeconds: boolean = true): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const hr = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return withSeconds ? `${d}.${m}.${y} ${hr}:${min}:${sec}` : `${d}.${m}.${y} ${hr}:${min}`;
}
