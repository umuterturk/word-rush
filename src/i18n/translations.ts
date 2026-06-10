export type Language = 'en' | 'tr';

export interface Translations {
  // Start screen
  startBadge: string;
  gameTitle: string;
  gameSubtitle: (minutes: number) => string;
  best: string;
  solo: string;
  quickMatch: string;
  createRoom: string;
  joinRoom: string;
  startHint: string;

  // Countdown
  countdown1v1: string;
  countdownSubtitle: string;

  // Game screen
  score: string;
  time: string;
  you: string;
  them: string;
  winning: string;
  vs: string;
  find: string;
  clear: string;
  skip: string;
  tapToSpell: string;
  paused: string;
  pauseHint: string;

  // End screen
  timesUp: string;
  newBest: string;
  point: string;
  points: string;
  youWin: string;
  youLose: string;
  tieGame: string;
  opponentWantsRematch: string;
  rematch: string;
  playAgain: string;
  menu: string;

  // Multiplayer lobby
  rematchBadge: string;
  waitingForOpponent: string;
  challengingAgain: string;
  findingOpponent: string;
  searchingForRival: string;
  yourRoom: string;
  linkCopied: string;
  shareInviteLink: string;
  joinRoomTitle: string;
  enterCode: string;
  join: string;
  joiningRoom: string;
  connecting: string;
  opponentFound: string;
  waitingToJoin: string;
  cancel: string;

  // Share
  shareTitle: string;
  shareText: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Start screen
    startBadge: 'TAP LETTERS · SPELL TURKISH WORDS',
    gameTitle: 'WORD RUSH',
    gameSubtitle: (minutes) => `${minutes} minutes · how many words can you spell?`,
    best: 'BEST',
    solo: 'SOLO',
    quickMatch: 'QUICK MATCH',
    createRoom: 'CREATE ROOM',
    joinRoom: 'JOIN ROOM',
    startHint: 'Tap a falling letter to add it to your word.\nTap a buffered letter to remove it.\nSpell a valid Turkish word → hit SUBMIT to score!\nLonger words earn more points.',

    // Countdown
    countdown1v1: '1 VS 1',
    countdownSubtitle: 'spell Turkish words · longer = more points',

    // Game screen
    score: 'SCORE',
    time: 'TIME',
    you: 'YOU',
    them: 'THEM',
    winning: 'WINNING',
    vs: 'VS',
    find: 'FIND',
    clear: 'CLEAR',
    skip: 'SKIP',
    tapToSpell: 'tap letters to spell the word',
    paused: 'PAUSED',
    pauseHint: 'SPACE to resume',

    // End screen
    timesUp: 'TIME\'S UP',
    newBest: 'NEW BEST!',
    point: 'point',
    points: 'points',
    youWin: 'YOU WIN!',
    youLose: 'YOU LOSE',
    tieGame: 'TIE GAME',
    opponentWantsRematch: 'OPPONENT WANTS A REMATCH!',
    rematch: 'REMATCH',
    playAgain: 'PLAY AGAIN',
    menu: 'MENU',

    // Multiplayer lobby
    rematchBadge: 'REMATCH',
    waitingForOpponent: 'WAITING FOR OPPONENT',
    challengingAgain: 'Challenging your rival again...',
    findingOpponent: 'FINDING OPPONENT',
    searchingForRival: 'Searching for a rival...',
    yourRoom: 'YOUR ROOM',
    linkCopied: 'LINK COPIED!',
    shareInviteLink: 'SHARE INVITE LINK',
    joinRoomTitle: 'JOIN ROOM',
    enterCode: 'ENTER CODE',
    join: 'JOIN',
    joiningRoom: 'JOINING ROOM',
    connecting: 'Connecting...',
    opponentFound: 'OPPONENT FOUND',
    waitingToJoin: 'Waiting for opponent to join...',
    cancel: 'CANCEL',

    // Share
    shareTitle: 'Word Rush 1v1',
    shareText: 'Join my game!',
  },
  tr: {
    // Start screen
    startBadge: 'HARFLERİ DOKUN · TÜRKÇE KELİME YAZ',
    gameTitle: 'WORD RUSH',
    gameSubtitle: (minutes) => `${minutes} dakika · kaç kelime yazabilirsin?`,
    best: 'EN İYİ',
    solo: 'TEK',
    quickMatch: 'HIZLI EŞLEŞTİRME',
    createRoom: 'ODA OLUŞTUR',
    joinRoom: 'ODAYA KATIL',
    startHint: 'Düşen harfe dokun, kelimene ekle.\nEklenen harfe dokun, çıkar.\nGeçerli Türkçe kelime yaz → GÖNDER\'e bas!\nUzun kelimeler daha çok puan.',

    // Countdown
    countdown1v1: '1\'E 1',
    countdownSubtitle: 'türkçe kelime yaz · uzun = çok puan',

    // Game screen
    score: 'PUAN',
    time: 'SÜRE',
    you: 'SEN',
    them: 'RAKIP',
    winning: 'KAZANIYOR',
    vs: 'VS',
    find: 'BUL',
    clear: 'TEMİZLE',
    skip: 'ATLA',
    tapToSpell: 'kelimeyi yazmak için harflere dokun',
    paused: 'DURAKLATILDI',
    pauseHint: 'Devam etmek için SPACE',

    // End screen
    timesUp: 'SÜRE BİTTİ',
    newBest: 'YENİ REKOR!',
    point: 'puan',
    points: 'puan',
    youWin: 'KAZANDIN!',
    youLose: 'KAYBETTİN',
    tieGame: 'BERABERE',
    opponentWantsRematch: 'RAKİP REVANŞİ İSTİYOR!',
    rematch: 'REVANŞ',
    playAgain: 'TEKRAR OYNA',
    menu: 'MENÜ',

    // Multiplayer lobby
    rematchBadge: 'REVANŞ',
    waitingForOpponent: 'RAKİP BEKLENİYOR',
    challengingAgain: 'Rakibine yeniden meydan okuyorsun...',
    findingOpponent: 'RAKİP ARANIYOR',
    searchingForRival: 'Rakip aranıyor...',
    yourRoom: 'ODAN',
    linkCopied: 'LINK KOPYALANDI!',
    shareInviteLink: 'DAVETİYE LİNKİNİ PAYLAŞ',
    joinRoomTitle: 'ODAYA KATIL',
    enterCode: 'KODU GİR',
    join: 'KATIL',
    joiningRoom: 'ODAYA KATILINIYOR',
    connecting: 'Bağlanıyor...',
    opponentFound: 'RAKİP BULUNDU',
    waitingToJoin: 'Rakip katılması bekleniyor...',
    cancel: 'İPTAL',

    // Share
    shareTitle: 'Word Rush 1\'e 1',
    shareText: 'Oyunuma katıl!',
  },
};
