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
  leaderboardNamePrompt: string;
  login: string;
  save: string;
  leaderboard: string;
  leaderboardTop3: string;
  leaderboardToday: string;
  leaderboardTodayHome: string;
  leaderboardWeekly: string;
  leaderboardAllTime: string;
  leaderboardEmpty: string;
  navHome: string;
  navLeaderboard: string;
  navFriends: string;
  startNavLabel: string;
  friendsEmpty: string;
  friendsHint: string;
  friendsRecord: string;
  challenge: string;
  challenging: string;
  gameRequestTitle: string;
  gameRequestMessage: string;
  accept: string;
  decline: string;
  play: string;
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
  fastBonus1: string;
  fastBonus2: string;
  rareBonus1: string;
  rareBonus2: string;
  wordStreakAria: string;
  wordStreakPop: string;
  hintBadge: string;
  tapToSpell: string;
  paused: string;
  pauseHint: string;
  resign: string;
  resignConfirmTitle: string;
  resignConfirmMessage: string;
  resignConfirmYes: string;
  resignConfirmNo: string;
  reportWord: string;
  reportWordDone: string;
  reportWordAria: string;
  reportWordConfirmTitle: string;
  reportWordConfirmMessage: string;
  reportWordConfirmYes: string;
  reportWordConfirmNo: string;

  // End screen
  timesUp: string;
  soloComplete: string;
  newBest: string;
  newBestHonor: string;
  newBestHonorFirst: string;
  leaderboardHonor: string;
  epicHonorBoth: string;
  point: string;
  points: string;
  youWin: string;
  youLose: string;
  tieGame: string;
  opponentWantsRematch: string;
  opponentResigned: string;
  rematch: string;
  playAgain: string;
  menu: string;

  // Badges
  badgesCollectedTitle: string;
  badgesCollectedSubtitle: string;
  profileBadgesTitle: string;
  profileBadgesEmpty: string;
  profileBadgesTotal: string;
  homeAchievementsTitle: string;
  homeGamesPlayed: string;
  homeBadgesUnlocked: string;
  homeEarnedBadgesLabel: string;
  homeTrophies: string;
  homeTagline: string;
  homeSkillsLabel: string;
  homeSkillsEmpty: string;
  homeSkillPoints: string;
  homeTitlesLabel: string;
  homeTitleSolo: string;
  homeTitleRival: string;
  homeTitleChampion: string;
  homeNoTitle: string;
  homePlaySoloHint: string;
  homePlayRivalHint: string;
  streakBadge2: string;
  streakBadge3: string;
  streakBadge4: string;
  streakBadge5: string;
  streakBadge6: string;
  streakBadge7: string;
  badgeMpDebut: string;
  badgeMpSparring: string;
  badgeMpArena: string;
  badgeMpGladiator: string;
  badgeMpLegend: string;
  badgeMpChampion: string;
  badgeMpDominator: string;
  badgeSoloDebut: string;
  badgeSoloGrinder: string;
  badgeShortFast1: string;
  badgeShortFast2: string;
  badgeShortDouble: string;
  badgeShortMpDebut: string;
  badgeShortMpSparring: string;
  badgeShortMpArena: string;
  badgeShortMpGladiator: string;
  badgeShortMpLegend: string;
  badgeShortMpChampion: string;
  badgeShortMpDominator: string;
  badgeShortSoloDebut: string;
  badgeShortSoloGrinder: string;
  badgeDetailTypeSkill: string;
  badgeDetailTypeTitle: string;
  badgeDetailEarnedCount: string;
  badgeDetailClose: string;
  badgeDescFast1: string;
  badgeDescFast2: string;
  badgeDescDouble: string;
  badgeDescStreak: string;
  badgeDescMpDebut: string;
  badgeDescMpSparring: string;
  badgeDescMpArena: string;
  badgeDescMpGladiator: string;
  badgeDescMpLegend: string;
  badgeDescMpChampion: string;
  badgeDescMpDominator: string;
  badgeDescSoloDebut: string;
  badgeDescSoloGrinder: string;

  // Multiplayer lobby
  creatingRoom: string;
  sharingInvite: string;
  rematchBadge: string;
  waitingForOpponent: string;
  challengingAgain: string;
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
  invitedGameTitle: string;
  invitedGameWaiting: string;
  invitedGameWaitingAnonymous: string;
  gameMetaHost: string;
  gameMetaLanguage: string;
  gameMetaDuration: string;
  gameMetaCreated: string;
  gameLangTr: string;
  gameLangEn: string;
  gameDurationMin: string;
  gameCreatedJustNow: string;
  gameCreatedMinutesAgo: string;
  gameCreatedHoursAgo: string;
  gameCreatedDaysAgo: string;
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
    leaderboardNamePrompt: 'Enter your name to appear on the leaderboard.',
    login: 'LOGIN',
    save: 'SAVE',
    leaderboard: 'TOP 10',
    leaderboardTop3: 'TOP 3',
    leaderboardToday: 'TODAY',
    leaderboardTodayHome: "TODAY'S RECORDS",
    leaderboardWeekly: 'THIS WEEK',
    leaderboardAllTime: 'ALL TIME',
    leaderboardEmpty: 'No scores yet',
    navHome: 'Home',
    navLeaderboard: 'Ranks',
    navFriends: 'Friends',
    startNavLabel: 'Main menu',
    friendsEmpty: 'No friends yet. Play a private match and add your opponent.',
    friendsHint: 'Same device/browser only — your profile stays on this device.',
    friendsRecord: '{wins}W · {losses}L · {ties}T',
    challenge: 'Challenge',
    challenging: 'Sending…',
    gameRequestTitle: 'GAME REQUEST',
    gameRequestMessage: '{name} wants to play. Accept?',
    accept: 'ACCEPT',
    decline: 'DECLINE',
    play: 'PLAY',
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
    fastBonus1: 'FAST!',
    fastBonus2: 'LIGHTNING!',
    rareBonus1: 'RARE',
    rareBonus2: 'LEGENDARY',
    wordStreakAria: '{count} word streak',
    wordStreakPop: '{count} STREAK',
    hintBadge: 'TAP',
    tapToSpell: 'tap letters to spell the word',
    paused: 'PAUSED',
    pauseHint: 'SPACE to resume',
    resign: 'RESIGN',
    resignConfirmTitle: 'RESIGN?',
    resignConfirmMessage: 'You will forfeit this game.',
    resignConfirmYes: 'RESIGN',
    resignConfirmNo: 'KEEP PLAYING',
    reportWord: 'Report',
    reportWordDone: 'Reported',
    reportWordAria: 'Report inappropriate word',
    reportWordConfirmTitle: 'REPORT WORD?',
    reportWordConfirmMessage: 'Report "{word}" as inappropriate? The game will pause while you decide.',
    reportWordConfirmYes: 'REPORT',
    reportWordConfirmNo: 'CANCEL',

    // End screen
    timesUp: 'TIME\'S UP',
    soloComplete: 'COMPLETE',
    newBest: 'NEW BEST!',
    newBestHonor: 'You smashed your personal best of {prev} — {score} points of pure skill.',
    newBestHonorFirst: 'Your first mark on the board: {score} points. The journey begins.',
    leaderboardHonor: 'A top-ten score. The leaderboard will remember this one.',
    epicHonorBoth: 'New personal best and a top-three finish. Absolutely legendary.',
    point: 'point',
    points: 'points',
    youWin: 'YOU WIN!',
    youLose: 'YOU LOSE',
    tieGame: 'TIE GAME',
    opponentWantsRematch: 'OPPONENT WANTS A REMATCH!',
    opponentResigned: 'OPPONENT RESIGNED',
    rematch: 'REMATCH',
    playAgain: 'PLAY AGAIN',
    menu: 'MENU',

    badgesCollectedTitle: 'BADGES EARNED',
    badgesCollectedSubtitle: 'Your collection grows…',
    profileBadgesTitle: 'BADGE COLLECTION',
    profileBadgesEmpty: 'Play matches to earn speed, streak, and rival badges.',
    profileBadgesTotal: '{count} total',
    homeAchievementsTitle: 'Your achievements',
    homeGamesPlayed: 'GAMES',
    homeBadgesUnlocked: 'BADGES',
    homeEarnedBadgesLabel: 'Earned badges',
    homeTrophies: 'TROPHIES',
    homeTagline: 'Catch letters · spell words · crush your best',
    homeSkillsLabel: 'SKILL LOOT',
    homeSkillsEmpty: 'Speed, streaks & 2× bonuses land here — go play!',
    homeSkillPoints: 'SKILL PTS',
    homeTitlesLabel: 'TITLES',
    homeTitleSolo: 'SOLO',
    homeTitleRival: 'RIVAL',
    homeTitleChampion: 'CHAMP',
    homeNoTitle: 'UNRANKED',
    homePlaySoloHint: 'Clear the board',
    homePlayRivalHint: '1v1 challenge',
    streakBadge2: '2× STREAK',
    streakBadge3: '3× STREAK',
    streakBadge4: '4× STREAK',
    streakBadge5: '5× STREAK',
    streakBadge6: '6× STREAK',
    streakBadge7: '7× STREAK',
    badgeMpDebut: 'FIRST RIVAL',
    badgeMpSparring: 'BATTLE TESTED',
    badgeMpArena: 'ARENA REGULAR',
    badgeMpGladiator: 'GRID GLADIATOR',
    badgeMpLegend: 'WORD LEGEND',
    badgeMpChampion: 'CHAMPION',
    badgeMpDominator: 'DOMINATOR',
    badgeSoloDebut: 'FIRST RUSH',
    badgeSoloGrinder: 'SOLO GRINDER',
    badgeShortFast1: 'FAST',
    badgeShortFast2: 'BOLT',
    badgeShortDouble: '2×',
    badgeShortMpDebut: 'RIVAL',
    badgeShortMpSparring: 'SPAR',
    badgeShortMpArena: 'ARENA',
    badgeShortMpGladiator: 'GLAD',
    badgeShortMpLegend: 'LEGEND',
    badgeShortMpChampion: 'CHAMP',
    badgeShortMpDominator: 'BOSS',
    badgeShortSoloDebut: 'RUSH',
    badgeShortSoloGrinder: 'GRIND',
    badgeDetailTypeSkill: 'SKILL BADGE',
    badgeDetailTypeTitle: 'TITLE',
    badgeDetailEarnedCount: 'Collected ×{count}',
    badgeDetailClose: 'CLOSE',
    badgeDescFast1: 'Clear words faster than the clock expects.',
    badgeDescFast2: 'Lightning solves — elite speed on the board.',
    badgeDescDouble: 'Score doubled while your 2× bonus is burning hot.',
    badgeDescStreak: 'Chain {count} correct words in a row without missing.',
    badgeDescMpDebut: 'Your first rival match — welcome to the arena.',
    badgeDescMpSparring: '{count} multiplayer battles — battle tested.',
    badgeDescMpArena: '{count} rival matches — a true arena regular.',
    badgeDescMpGladiator: '{count} grid battles fought and logged.',
    badgeDescMpLegend: '{count} multiplayer matches. Legendary dedication.',
    badgeDescMpChampion: 'Your first multiplayer win — champion status.',
    badgeDescMpDominator: '{count} rival victories — you own the board.',
    badgeDescSoloDebut: 'Your first solo rush — the journey begins.',
    badgeDescSoloGrinder: '{count} solo games cleared — always one more round.',

    // Multiplayer lobby
    creatingRoom: 'CREATING ROOM...',
    sharingInvite: 'OPENING SHARE...',
    rematchBadge: 'REMATCH',
    waitingForOpponent: 'WAITING FOR OPPONENT',
    challengingAgain: 'Challenging your rival again...',
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
    invitedGameTitle: "YOU'RE IN!",
    invitedGameWaiting: 'Waiting for {name} to start the game...',
    invitedGameWaitingAnonymous: 'Waiting for the game to start...',
    gameMetaHost: 'Host',
    gameMetaLanguage: 'Language',
    gameMetaDuration: 'Duration',
    gameMetaCreated: 'Created',
    gameLangTr: 'Turkish',
    gameLangEn: 'English',
    gameDurationMin: '{n} min',
    gameCreatedJustNow: 'Just now',
    gameCreatedMinutesAgo: '{n} min ago',
    gameCreatedHoursAgo: '{n} h ago',
    gameCreatedDaysAgo: '{n} d ago',
    shareInviteHint: 'Paste the link in WhatsApp, iMessage, or any chat to invite your friend.',
    cancel: 'CANCEL',

    // Share
    shareTitle: 'YazYaz — 1v1 Challenge',
    shareText: "Think you can beat me? Prove it. 😏🔥",

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
    leaderboardNamePrompt: 'Skor tablosunda görünmek için adını gir.',
    login: 'GİRİŞ YAP',
    save: 'KAYDET',
    leaderboard: 'İLK 10',
    leaderboardTop3: 'İLK 3',
    leaderboardToday: 'BUGÜN',
    leaderboardTodayHome: 'BUGÜNÜN REKORLARI',
    leaderboardWeekly: 'BU HAFTA',
    leaderboardAllTime: 'TÜM ZAMANLAR',
    leaderboardEmpty: 'Henüz skor yok',
    navHome: 'Ana Sayfa',
    navLeaderboard: 'Sıralama',
    navFriends: 'Arkadaşlar',
    startNavLabel: 'Ana menü',
    friendsEmpty: 'Henüz arkadaş yok. Özel maç oyna ve rakibini ekle.',
    friendsHint: 'Profilin bu cihazda kalır — farklı cihazda yeni hesap oluşur.',
    friendsRecord: '{wins}G · {losses}M · {ties}B',
    challenge: 'Davet Et',
    challenging: 'Gönderiliyor…',
    gameRequestTitle: 'OYUN DAVETİ',
    gameRequestMessage: '{name} oynamak istiyor. Kabul ediyor musun?',
    accept: 'KABUL',
    decline: 'REDDET',
    play: 'OYNA',
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
    fastBonus1: 'HIZLI!',
    fastBonus2: 'YILDIRIM HIZINDA!',
    rareBonus1: 'NADİR',
    rareBonus2: 'EŞSİZ',
    wordStreakAria: '{count} kelime serisi',
    wordStreakPop: '{count} SERİ',
    hintBadge: 'DOKUN',
    tapToSpell: 'kelimeyi yazmak için harflere dokun',
    paused: 'DURAKLATILDI',
    pauseHint: 'Devam etmek için SPACE',
    resign: 'PES ET',
    resignConfirmTitle: 'PES ET?',
    resignConfirmMessage: 'Bu oyunu bırakacaksın.',
    resignConfirmYes: 'PES ET',
    resignConfirmNo: 'DEVAM ET',
    reportWord: 'Bildir',
    reportWordDone: 'Bildirildi',
    reportWordAria: 'Uygunsuz kelimeyi bildir',
    reportWordConfirmTitle: 'KELİMEYİ BİLDİR?',
    reportWordConfirmMessage: '"{word}" kelimesini uygunsuz olarak bildirmek istiyor musun? Karar verirken oyun duraklatılır.',
    reportWordConfirmYes: 'BİLDİR',
    reportWordConfirmNo: 'İPTAL',

    // End screen
    timesUp: 'SÜRE BİTTİ',
    soloComplete: 'TAMAMLANDI',
    newBest: 'YENİ REKOR!',
    newBestHonor: 'Kişisel rekorunu ({prev}) geçtin — {score} puanla muhteşem bir oyun.',
    newBestHonorFirst: 'İlk skorun: {score} puan. Serüven şimdi başlıyor.',
    leaderboardHonor: 'İlk ona giren bir skor. Tablo bunu unutmayacak.',
    epicHonorBoth: 'Yeni rekor ve ilk üç. Tam anlamıyla efsanevi.',
    point: 'puan',
    points: 'puan',
    youWin: 'KAZANDIN!',
    youLose: 'KAYBETTİN',
    tieGame: 'BERABERE',
    opponentWantsRematch: 'RAKİP RÖVANŞ İSTİYOR!',
    opponentResigned: 'RAKİP PES ETTİ',
    rematch: 'RÖVANŞ',
    playAgain: 'TEKRAR OYNA',
    menu: 'MENÜ',

    badgesCollectedTitle: 'ROZETLER KAZANILDI',
    badgesCollectedSubtitle: 'Koleksiyonun büyüyor…',
    profileBadgesTitle: 'ROZET KOLEKSİYONU',
    profileBadgesEmpty: 'Hız, seri ve düello rozetleri kazanmak için oyna.',
    profileBadgesTotal: 'toplam {count}',
    homeAchievementsTitle: 'Başarıların',
    homeGamesPlayed: 'OYUN',
    homeBadgesUnlocked: 'ROZET',
    homeEarnedBadgesLabel: 'Kazanılan rozetler',
    homeTrophies: 'ROZETLER',
    homeTagline: 'Harfleri yakala · kelime yaz · rekoru kır',
    homeSkillsLabel: 'YETENEK GANIMETİ',
    homeSkillsEmpty: 'Hız, seri ve 2× bonuslar burada — hadi oyna!',
    homeSkillPoints: 'YETENEK',
    homeTitlesLabel: 'UNVANLAR',
    homeTitleSolo: 'SOLO',
    homeTitleRival: 'RAKİP',
    homeTitleChampion: 'ŞAMP',
    homeNoTitle: 'ÇIRAK',
    homePlaySoloHint: 'Tahtayı temizle',
    homePlayRivalHint: '1v1 meydan oku',
    streakBadge2: '2× SERİ',
    streakBadge3: '3× SERİ',
    streakBadge4: '4× SERİ',
    streakBadge5: '5× SERİ',
    streakBadge6: '6× SERİ',
    streakBadge7: '7× SERİ',
    badgeMpDebut: 'İLK RAKİP',
    badgeMpSparring: 'DENENMİŞ',
    badgeMpArena: 'ARENA MÜDAVİMİ',
    badgeMpGladiator: 'IZGARA GLADYATÖRÜ',
    badgeMpLegend: 'KELİME EFSANESİ',
    badgeMpChampion: 'ŞAMPİYON',
    badgeMpDominator: 'HAKİM',
    badgeSoloDebut: 'İLK KOŞU',
    badgeSoloGrinder: 'SOLO USTASI',
    badgeShortFast1: 'HIZLI',
    badgeShortFast2: 'YILDIRIM',
    badgeShortDouble: '2×',
    badgeShortMpDebut: 'RAKİP',
    badgeShortMpSparring: 'DÖĞÜŞ',
    badgeShortMpArena: 'ARENA',
    badgeShortMpGladiator: 'GLAD',
    badgeShortMpLegend: 'EFSANE',
    badgeShortMpChampion: 'ŞAMP',
    badgeShortMpDominator: 'HAKİM',
    badgeShortSoloDebut: 'KOŞU',
    badgeShortSoloGrinder: 'USTA',
    badgeDetailTypeSkill: 'YETENEK ROZETİ',
    badgeDetailTypeTitle: 'UNVAN',
    badgeDetailEarnedCount: 'Toplam ×{count}',
    badgeDetailClose: 'KAPAT',
    badgeDescFast1: 'Kelimeyi saatin beklemediği hızda bitir.',
    badgeDescFast2: 'Yıldırım hızında çözümler — üst düzey tempo.',
    badgeDescDouble: '2× bonusun aktifken puanın ikiye katlanır.',
    badgeDescStreak: 'Arka arkaya {count} kelimeyi hatasız tamamla.',
    badgeDescMpDebut: 'İlk düello maçın — arenaya hoş geldin.',
    badgeDescMpSparring: '{count} çok oyunculu maç — sınanmış savaşçı.',
    badgeDescMpArena: '{count} rakip maçı — gerçek bir arena müdavimi.',
    badgeDescMpGladiator: '{count} ızgara savaşı — gladyatör ruhu.',
    badgeDescMpLegend: '{count} çok oyunculu maç. Efsanevi bağlılık.',
    badgeDescMpChampion: 'İlk çok oyunculu galibiyetin — şampiyonluk.',
    badgeDescMpDominator: '{count} rakip galibiyeti — tahtaya hükmediyorsun.',
    badgeDescSoloDebut: 'İlk solo koşun — serüven başlıyor.',
    badgeDescSoloGrinder: '{count} solo maç — hep bir tur daha.',

    // Multiplayer lobby
    creatingRoom: 'ODA OLUŞTURULUYOR...',
    sharingInvite: 'PAYLAŞIM AÇILIYOR...',
    rematchBadge: 'RÖVANŞ',
    waitingForOpponent: 'RAKİP BEKLENİYOR',
    challengingAgain: 'Rakibine yeniden meydan okuyorsun...',
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
    invitedGameTitle: 'OYUNA KATILDIN!',
    invitedGameWaiting: '{name} oyunu başlatması bekleniyor...',
    invitedGameWaitingAnonymous: 'Oyunun başlaması bekleniyor...',
    gameMetaHost: 'Oluşturan',
    gameMetaLanguage: 'Dil',
    gameMetaDuration: 'Süre',
    gameMetaCreated: 'Oluşturulma',
    gameLangTr: 'Türkçe',
    gameLangEn: 'İngilizce',
    gameDurationMin: '{n} dk',
    gameCreatedJustNow: 'Az önce',
    gameCreatedMinutesAgo: '{n} dk önce',
    gameCreatedHoursAgo: '{n} sa önce',
    gameCreatedDaysAgo: '{n} gün önce',
    shareInviteHint: 'Linki WhatsApp, mesaj veya sohbet uygulamanıza yapıştırarak arkadaşınızı davet edin.',
    cancel: 'İPTAL',

    // Share
    shareTitle: 'YazYaz — 1\'e 1 Meydan Okuma',
    shareText: 'Beni geçebileceğini mi sanıyorsun? Hadi göster kendini. 😏🔥',

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
