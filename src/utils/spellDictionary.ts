const COMMON_WORDS = `
a about above accept according across act action add add-ins after again against age ago agree all allow almost alone along already also although always am among amount an and another answer any anyone anything appear apply are area around as ask at available away
back bad be became because become been before begin behind being believe below best better between big bit both bring build business but by
call came can cannot caption case change changes character characters child children city class clear close code come comment comments company complete consider continue copy correct could country course create created cross current
data day days did different do document documents does doing done down during
each early edit editor email end enough even ever every example export
few figure file files find first following for form format found from full further
general get give go going good got great group
had has have he help her here high him his home how however
i if image important in include including information insert into is it its itself
just
keep know
large last later learn left less let letter life like line list little live long look lot low
made mail make man many may me mean means menu might more most move much must my
name need never new next no not note nothing now number numbers
of off often old on once one online only open or order other our out over own
page pages part people person place please point possible present print problem program provide public put
question quite
rather read real really reason report result right run
said same say says second see seem set several she should show side since small so some something sometimes soon source spell spreadsheet state still such system
table take tell than that the their them then there these they thing think this those though thought through time to today together too tool tools top toward two type
under until up upon us use used using
very view
want was way we web well were what when where which while who whole why will with within without word words work world would write writing
year years you your
able accept accepted access account across actual actually add added adding additional address administration advance advantage agree agreement ahead allow allowed almost already although always among amount analysis animal another answer appear appeared application apply approach appropriate area argue argument around arrive article artist assume assumption attack attention audience author available average avoid award aware away
base based basic basis bear beautiful became become becoming been before began begin beginning behavior behind being believe believed below benefit best better beyond bit black blue board body book both box break brief bring broad broke broken budget build building built business button buy
call called calling camera campaign can cannot capital car card care career carry case cash catch cause cell center central century certain certainly chair challenge chance change changed changes character charge chart check choice choose chose chosen church city civil claim class clean clear clearly close closed closely clothes club coach cold collection college color come comes coming comment commercial common community company compare comparison complete completely computer concept concern condition conference consider considered consist consumer contain containing content continue continued contract control cost could country county couple course court cover create created creative credit crime cultural culture cup current customer cut
dark data date daughter day days dead deal death debate decide decision deep defense degree democratic describe described description design designed despite detail determine determined develop developed development die died difference different difficult dinner direction director discover discuss discussion disease do doctor does dog dollar done door down draw dream dress drink drive drop drug during
each early east easy eat economic economy edge education effect effective effort eight either election else employee end energy enjoy enough enter entire environment environmental environmental especially establish even evening event ever every everybody everyone everything evidence exactly example executive exist expect expected experience expert explain eye
face fact factor fail fall family far farm fast father fear federal feel feeling few field fight figure fill film final finally financial find finding fine finger finish fire firm first fish five floor fly focus follow following food foot for force foreign forget form former forward found four free freedom friend from front full fund future
game garden gas general generally generation get getting girl give given gives glass go goal god goes going gold gone good got government grand great green ground group grow growth guess gun guy
hair half hand hang happen happened happy hard has hat have having he head health hear heard heart heat heavy help her here herself high him himself his history hit hold home hope hospital hot hotel hour house how however huge human hundred husband
idea identify if image imagine impact important improve in include including income increase indeed indicate individual industry information inside instead institution interest interested interesting international interview into investment involve involved issue it item its itself
job join just
keep key kid kill kind kitchen know knowledge
land language large largely last late later laugh law lawyer lay lead leader learn least leave left leg less let letter level lie life light like likely line list listen little live living local long look lose loss lot love low
machine magazine main mainly major majority make makes making man manage management manager many market marriage material matter may maybe me mean means measure media medical meet meeting member memory mention message method middle might military million mind minute miss mission model modern moment money month more morning most mother mouth move movement movie much music must my myself
name nation national natural nature near nearly necessary need network never new news newspaper next nice night no none nor north not note nothing notice now number
object occur of off offer office officer official often oh oil ok old on once one only onto open operation opportunity option or order organization other others our out outside over own owner
page pain painting paper parent part participant particular particularly partner party pass past patient pattern pay peace people per perform performance perhaps period person personal phone photo physical pick picture piece place plan plane plant play player please pm point police policy political politics poor popular population position positive possible power practice prepare present president pressure pretty prevent price private probably problem process produce product production professional professor program project property protect prove provide public pull purpose push put
quality question quickly quite
race radio raise range rate rather reach read ready real reality realize really reason receive recent recently recognize record red reduce reflect region relate relationship religious remain remember remove report represent represent republican require research resource respond response responsibility rest result return reveal rich right rise risk road rock role room rule run
safe same save say says scene school science scientist score sea season seat second section security see seek seem seemed seen sell send senior sense series serious serve service set seven several sex sexual shake share she shoot short shot should shoulder show side sign significant similar simple simply since sing single sister sit site situation six size skill skin small smile so social society soldier some somebody someone something sometimes son song soon sorry sort sound source south southern space speak special specific speech spend spend sport spring staff stage stand standard star start state statement station stay step still stock stop store story strategy street strong structure student study stuff style subject success successful such suddenly suffer suggest summer support sure surface system
table take talk task tax teach teacher team technology television tell ten tend term test than thank that the their them themselves then theory there these they thing think third this those though thought thousand threat three through throughout throw thus time to today together tonight too top total tough toward town trade traditional training travel treat treatment tree trial trip trouble true truth try turn tv two type
under understand unit until up upon us use used user usually
value various very victim view violence visit voice vote
wait walk wall want war watch water way we weapon wear week weight well west western what whatever when where whether which while white who whole whom whose why wide wife will win wind window wish with within without woman wonder word work worker world worry would write writer writing wrong
yard yeah year yell yes yet you young your yourself youth
opensuite webhook webhooks iframe sdk docx xlsx pptx pdf markdown spreadsheet powerpoint microsoft widget
welcome powerful suite lets browser feature text formatting formula presentation slide deck customizable customize background layout preview viewer directly support import export portable plain integration integrate application via embed server operation notification seamless client click globe icon bar option rich excel direct preview
memo request context due decision subject team october january february march april june july august september november december monday tuesday wednesday thursday friday saturday sunday
`;

function tokenize(source: string): string[] {
  return source
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(word => word.length > 1);
}

export const BASE_DICTIONARY: ReadonlySet<string> = new Set(tokenize(COMMON_WORDS));

const USER_DICT_KEY = 'opensuite_user_dictionary';

export function loadUserDictionary(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_DICT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(word => String(word).toLowerCase()) : [];
  } catch {
    return [];
  }
}

export function addUserDictionaryWord(word: string): string[] {
  const next = new Set(loadUserDictionary());
  next.add(word.toLowerCase());
  const list = [...next];
  localStorage.setItem(USER_DICT_KEY, JSON.stringify(list));
  return list;
}

export function isProbablyNameOrAcronym(word: string): boolean {
  if (word.length <= 5 && word === word.toUpperCase() && /[A-Z]/.test(word)) return true;
  return /[A-Z]/.test(word.slice(1));
}

function isKnownWord(dictionary: Set<string>, word: string): boolean {
  if (dictionary.has(word)) return true;
  const candidates = new Set<string>();
  if (word.endsWith('ies')) candidates.add(word.slice(0, -3) + 'y');
  if (word.endsWith('es')) candidates.add(word.slice(0, -2));
  if (word.endsWith('s')) candidates.add(word.slice(0, -1));
  if (word.endsWith('ing')) {
    candidates.add(word.slice(0, -3));
    candidates.add(word.slice(0, -3) + 'e');
  }
  if (word.endsWith('ed')) {
    candidates.add(word.slice(0, -2));
    candidates.add(word.slice(0, -2) + 'e');
  }
  if (word.endsWith('ly')) candidates.add(word.slice(0, -2));
  for (const stem of candidates) {
    if (stem.length > 2 && dictionary.has(stem)) return true;
    if (stem.length > 3 && stem.charAt(stem.length - 1) === stem.charAt(stem.length - 2) && dictionary.has(stem.slice(0, -1))) return true;
  }
  return false;
}

export function collectMisspellings(root: HTMLElement, dictionary: Set<string>): string[] {
  const words = (root.textContent || '').match(/[A-Za-z']+/g) || [];
  const seen = new Set<string>();
  const misspelled: string[] = [];
  words.forEach(word => {
    const clean = word.toLowerCase().replace(/^'+|'+$/g, '');
    if (!clean || clean.length <= 2 || isKnownWord(dictionary, clean) || isProbablyNameOrAcronym(word) || seen.has(clean)) return;
    seen.add(clean);
    misspelled.push(word);
  });
  return misspelled;
}
