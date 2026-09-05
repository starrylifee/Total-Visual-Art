// The IDs preserve the original folder numbers; array order is the production order.
const entries = [
  ['08', '시끌벅적 해변', '08_시끌벅적 해변_까먹었어요', '바다'],
  ['19', '바다에서의 하루', '19_바다에서의 하루_키위새', '바다'],
  ['06', '수영장 (다이빙)', '06_수영장 (다이빙)_고카콜라', '물놀이'],
  ['09', '워터파크의 하루', '09_워터파크의 하루_도도새', '물놀이'],
  ['13', '즐거운 워터파크', '13_즐거운 워터파크_몽냥이', '물놀이'],
  ['16', '수영장 (워터파크)', '16_수영장 (워터파크)_서쪽이', '물놀이'],
  ['03', '아쿠아리움', '03_아쿠아리움_돌고래', '물놀이'],
  ['04', '산 사이 보이는 노을', '04_산 사이 보이는 노을_뽀내나앙우유우', '풍경'],
  ['12', '고인돌', '12_고인돌_송둘기', '풍경'],
  ['01', '다보탑', '01_다보탑_삐리삐리', '풍경'],
  ['02', '축구', '02_축구_까마귀', '일상'],
  ['07', '주말', '07_주말_백설기', '일상'],
  ['14', '움직이는 우리의 도시', '14_움직이는 우리의 도시_토마토', '도시'],
  ['11', '돌아가는 길', '11_돌아가는 길_포롱', '도시'],
  ['10', '침대에 누워 핸드폰을 보는 사람', '10_침대에 누워 핸드폰을 보는 사람_복숭아7호', '일상'],
  ['05', '도하의 설빙 먹방', '05_도하의 설빙 먹방_매운돈가스', '일상'],
  ['15', '냠냠 중식', '15_냠냠 중식_진우동', '일상'],
  ['17', '바나나 우유먹기 신기록', '17_바나나 우유먹기 신기록_햄스터', '일상'],
  ['18', '달을 봤는데 외계인이', '18_달을 봤는데 외계인이_송아지', '상상'],
  ['20', '별자리', '20_별자리_동키콩', '상상'],
];

export const worldTheme = { id: 'summer-vacation', title: '여름방학에 한 일' };

export const worldCatalog = entries.map(([id, title, sourceFolder, category], index) => ({
  themeId: worldTheme.id,
  id, title, sourceFolder, category, order: index + 1,
  status: 'prototype',
  scene: { '08': 'beach', '19': 'seaDay', '06': 'divingPool', '09': 'waterparkDay', '13': 'happyWaterpark', '16': 'waterparkPool', '03': 'aquarium', '04': 'sunsetValley', '12': 'dolmenField', '01': 'dabotap', '02':'soccerField', '07':'weekendRoom', '14':'movingCity', '11':'roadHome', '10':'phoneBedroom', '05':'dessertCafe', '15':'chineseRestaurant', '17':'bananaMilkRecord', '18':'moonCrater', '20':'constellationNight' }[id],
  sourceImage: `/student-worlds/${id}/start.jpg`,
}));
