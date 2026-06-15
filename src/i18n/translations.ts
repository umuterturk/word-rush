export type Language = 'en' | 'tr';

export interface Translations {
  // Start screen
  startBadge: string;
  gameTitle: string;
  gameSubtitle: string;
  best: string;
  yourBest: string;
  yourName: string;
  namePlaceholder: string;
  login: string;
  save: string;
  leaderboard: string;
  leaderboardEmpty: string;
  easy: string;
  normal: string;
  hard: string;
  playWithFriend: string;
  inviteFriend: string;
  gameUnavailable: string;
  gameUnavailableHint: string;
  startHint: string;

  // Countdown
  countdown1v1: string;
  countdownSubtitle: string;

  // Game screen
  score: string;
  time: string;
  elapsed: string;
  you: string;
  them: string;
  winning: string;
  vs: string;
  find: string;
  skip: string;
  doubleBonus: string;
  doubleBonusUsed: string;
  doubleBonusActive: string;
  hintBadge: string;
  tapToSpell: string;
  paused: string;
  pauseHint: string;
  resign: string;
  resignConfirmTitle: string;
  resignConfirmMessage: string;
  resignConfirmYes: string;
  resignConfirmNo: string;

  // End screen
  timesUp: string;
  soloComplete: string;
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
  creatingRoom: string;
  sharingInvite: string;
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
  shareInviteHint: string;
  cancel: string;

  // Share
  shareTitle: string;
  shareText: string;

  // Install
  installEyebrow: string;
  installTitle: string;
  installSubtitle: string;
  installHint: string;
  installStepIosShare: string;
  installStepIosAdd: string;
  installStepFirefoxMenu: string;
  installStepFirefoxInstall: string;
  installStepManualMenu: string;
  installStepManualAdd: string;
  installAction: string;
  installDismiss: string;

  // PWA
  pwaName: string;
  pwaDescription: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Start screen
    startBadge: 'TAP LETTERS · SPELL TURKISH WORDS',
    gameTitle: 'WORD RUSH',
    gameSubtitle: 'clear the board · 5 refills',
    best: 'BEST',
    yourBest: 'YOUR BEST',
    yourName: 'YOUR NAME',
    namePlaceholder: 'Enter name',
    login: 'LOGIN',
    save: 'SAVE',
    leaderboard: 'TOP 3',
    leaderboardEmpty: 'No scores yet',
    easy: 'EASY',
    normal: 'NORMAL',
    hard: 'HARD',
    playWithFriend: 'PLAY WITH FRIEND',
    inviteFriend: 'INVITE A FRIEND',
    gameUnavailable: 'GAME UNAVAILABLE',
    gameUnavailableHint: 'This invite link has expired or the game has already started.',
    startHint: '',

    // Countdown
    countdown1v1: '1 VS 1',
    countdownSubtitle: 'spell Turkish words · faster wins',

    // Game screen
    score: 'SCORE',
    time: 'TIME',
    elapsed: 'ELAPSED',
    you: 'YOU',
    them: 'THEM',
    winning: 'WINNING',
    vs: 'VS',
    find: 'FIND',
    skip: 'SKIP',
    doubleBonus: 'Half time, double score until you miss!',
    doubleBonusUsed: 'Used',
    doubleBonusActive: '2× active',
    hintBadge: 'TAP',
    tapToSpell: 'tap letters to spell the word',
    paused: 'PAUSED',
    pauseHint: 'SPACE to resume',
    resign: 'RESIGN',
    resignConfirmTitle: 'RESIGN?',
    resignConfirmMessage: 'You will forfeit this game.',
    resignConfirmYes: 'RESIGN',
    resignConfirmNo: 'KEEP PLAYING',

    // End screen
    timesUp: 'TIME\'S UP',
    soloComplete: 'COMPLETE',
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
    creatingRoom: 'CREATING ROOM...',
    sharingInvite: 'OPENING SHARE...',
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
    shareInviteHint: 'Paste the link in WhatsApp, iMessage, or any chat to invite your friend.',
    cancel: 'CANCEL',

    // Share
    shareTitle: 'Word Rush 1v1',
    shareText: 'Join my game!',

    // Install
    installEyebrow: 'GET THE APP',
    installTitle: 'Install Word Rush',
    installSubtitle: 'Full-screen play · one tap from your home screen',
    installHint: 'Add to your home screen for quick access.',
    installStepIosShare: 'Tap the Share button',
    installStepIosAdd: 'Choose "Add to Home Screen"',
    installStepFirefoxMenu: 'Tap the menu button ⋮',
    installStepFirefoxInstall: 'Tap Install or Add to Home screen',
    installStepManualMenu: 'Open the browser menu ⋮',
    installStepManualAdd: 'Tap Add to Home screen',
    installAction: 'Install',
    installDismiss: 'Dismiss',

    pwaName: 'Word Rush',
    pwaDescription: 'Tap falling letters to spell Turkish words against the clock.',
  },
  tr: {
    // Start screen
    startBadge: 'HARFLERİ DOKUN · TÜRKÇE KELİME YAZ',
    gameTitle: 'YAZYAZ',
    gameSubtitle: 'tahtayı temizle · 5 yenileme',
    best: 'EN İYİ',
    yourBest: 'EN İYİ SKORUN',
    yourName: 'ADIN',
    namePlaceholder: 'Adını yaz',
    login: 'GİRİŞ YAP',
    save: 'KAYDET',
    leaderboard: 'İLK 3',
    leaderboardEmpty: 'Henüz skor yok',
    easy: 'KOLAY',
    normal: 'NORMAL',
    hard: 'ZOR',
    playWithFriend: 'ARKADAŞINLA OYNA',
    inviteFriend: 'ARKADAŞINI DAVET ET',
    gameUnavailable: 'OYUN MEVCUT DEĞİL',
    gameUnavailableHint: 'Davet linkinin süresi dolmuş veya oyun başlamış olabilir.',
    startHint: '',

    // Countdown
    countdown1v1: '1\'E 1',
    countdownSubtitle: 'türkçe kelime yaz · hızlı olan kazanır',

    // Game screen
    score: 'PUAN',
    time: 'SÜRE',
    elapsed: 'GEÇEN',
    you: 'SEN',
    them: 'RAKIP',
    winning: 'KAZANIYOR',
    vs: 'VS',
    find: 'BUL',
    skip: 'ATLA',
    doubleBonus: 'Kaçırana kadar yarı süre, çift puan!',
    doubleBonusUsed: 'Kullanıldı',
    doubleBonusActive: '2× aktif',
    hintBadge: 'DOKUN',
    tapToSpell: 'kelimeyi yazmak için harflere dokun',
    paused: 'DURAKLATILDI',
    pauseHint: 'Devam etmek için SPACE',
    resign: 'PES ET',
    resignConfirmTitle: 'PES ET?',
    resignConfirmMessage: 'Bu oyunu bırakacaksın.',
    resignConfirmYes: 'PES ET',
    resignConfirmNo: 'DEVAM ET',

    // End screen
    timesUp: 'SÜRE BİTTİ',
    soloComplete: 'TAMAMLANDI',
    newBest: 'YENİ REKOR!',
    point: 'puan',
    points: 'puan',
    youWin: 'KAZANDIN!',
    youLose: 'KAYBETTİN',
    tieGame: 'BERABERE',
    opponentWantsRematch: 'RAKİP RÖVANŞ İSTİYOR!',
    rematch: 'RÖVANŞ',
    playAgain: 'TEKRAR OYNA',
    menu: 'MENÜ',

    // Multiplayer lobby
    creatingRoom: 'ODA OLUŞTURULUYOR...',
    sharingInvite: 'PAYLAŞIM AÇILIYOR...',
    rematchBadge: 'RÖVANŞ',
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
    shareInviteHint: 'Linki WhatsApp, mesaj veya sohbet uygulamanıza yapıştırarak arkadaşınızı davet edin.',
    cancel: 'İPTAL',

    // Share
    shareTitle: 'YazYaz 1\'e 1',
    shareText: 'Oyunuma katıl!',

    // Install
    installEyebrow: 'UYGULAMAYI İNDİR',
    installTitle: 'YazYaz\'ı Yükle',
    installSubtitle: 'Tam ekran · ana ekrandan tek dokunuşla',
    installHint: 'Hızlı erişim için ana ekrana ekle.',
    installStepIosShare: 'Paylaş düğmesine dokun',
    installStepIosAdd: '"Ana Ekrana Ekle"yi seç',
    installStepFirefoxMenu: 'Menü düğmesine ⋮ dokun',
    installStepFirefoxInstall: 'Yükle veya Ana ekrana ekle\'ye dokun',
    installStepManualMenu: 'Tarayıcı menüsünü ⋮ aç',
    installStepManualAdd: 'Ana ekrana ekle\'ye dokun',
    installAction: 'Yükle',
    installDismiss: 'Kapat',

    pwaName: 'YazYaz',
    pwaDescription: 'Harflere dokunarak süreye karşı Türkçe kelime yaz.',
  },
};
