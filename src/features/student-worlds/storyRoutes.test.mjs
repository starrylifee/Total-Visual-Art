// Continuous routes use the real scene geometry; no teleporting between waypoints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sampler } from './sceneAuditHarness.mjs';
import { worldConfigs } from './worldConfigs.js';
import { spawnCharacter, stepCharacter } from './platformPhysics.js';
import { moonFloor } from './moonTerrain.js';

export function travel(key, points) {
  const c=worldConfigs[key], sample=sampler(key);
  let p=spawnCharacter(c.spawn), frame=0, jumpAt=-100, stuck=0;
  const result=[];
  for(const [x,z,height=-10,label='waypoint',radius=.18] of points){
    let reached=false;
    for(let i=0;i<2400;i++,frame++){
      const distance=Math.hypot(x-p.x,z-p.z);
      if(distance<radius&&p.height>=height&&p.velocity===0&&p.jumpsUsed===0){reached=true;break;}
      const speed=c.isSwimming(p)?2.6:3.5;
      const d=Math.min(distance,speed/60);
      const look=Math.min(distance,2.4);
      const ahead=distance>.8?sample(p.x+(x-p.x)/distance*look,p.z+(z-p.z)/distance*look):[];
      const obstacle=ahead.some(s=>s.top>p.height+.35&&s.bottom<p.height+4.4&&s.top<p.height+4.4);
      const jump=((stuck>12||obstacle)&&p.jumpsUsed===0&&frame-jumpAt>75)||(frame-jumpAt===22&&p.jumpsUsed===1);
      if(jump&&p.jumpsUsed===0)jumpAt=frame;
      const prev=p;
      const flow=jump?null:c.flowAt?.(p);
      p=stepCharacter(p,(distance>.025?(x-p.x)/distance*d:0)+(flow?.x||0)/60,(distance>.025?(z-p.z)/distance*d:0)+(flow?.z||0)/60,1/60,jump,sample,c.bounds,c.floorAt);
      if(Math.hypot(p.x-prev.x,p.z-prev.z)<.005)stuck++;else stuck=0;
    }
    result.push({label,reached,x:p.x,z:p.z,height:p.height});
    if(!reached)break;
  }
  return result;
}

export const routes={
 beach:[[0,3],[-.3,1.8,.7,'낮은 튜브'],[-1.8,2.2,2.5,'세운 튜브'],[0,6],[-8,7],[-8,5,1.15,'가게 발판'],[-8,7],[3,7],[6,4.5,0,'돗자리'],[12.5,0],[7,0,4.6,'파라솔'],[12.5,0],[12,-14],[-8,-15,-1,'돌고래'],[12,-14],[12,11],[0,11,0,'복귀']],
 seaDay:[[-7,-4,-1,'친구들'],[0,4],[7,4],[7,1,-.75,'계단'],[7,-5,.14,'발판'],[7,4],[0,7,-1,'복귀']],
 divingPool:[[-13,14],...[-13,-7,-1,5,11].flatMap(z=>[[-13,z],[-9,z,.85,`출발대 ${z}`],[-13,z]]),[-9,11,.85,'마지막 출발대'],[-4,11,-1,'다이빙'],[3,0,-1,'레인'],[4,14,0,'얕은 출구'],[0,14,0,'복귀']],
 waterparkDay:[[0,14],[-10,16],[-10,10,.25,'초록 매트'],[-9,8],[-8.5,4,.4,'수박 튜브'],[0,4],[8,13],[8,12.65,.5,'빨강 튜브'],[8,11,-1,'튜브 구멍'],[11,11,-1,'튜브 탈출'],[0,4],[0,-3,0,'통로'],[7,-8,0,'피크닉'],[0,-3],[0,14,-1,'복귀']],
 happyWaterpark:[[0,10],[-7,10],[-7,7],[-7,-9,5.9,'파랑 계단'],[-3,-9,5.9,'파랑 출발',1.2],[-4.7,-5,4.4,'파랑 곡선',.8],[-2,0,2.2,'파랑 중간',.8],[-2.8,8,-1,'파랑 입수'],[0,10],[15,10],[15,9],[13,9],[13,-10,6.8,'빨강 계단'],[9,-10,6.8,'빨강 출발',1.2],[6,-5,5.3,'빨강 곡선',.8],[8.2,1,3.2,'빨강 중간',.8],[10,7,1,'빨강 끝',.8],[5.5,12,-1,'빨강 입수'],[0,15,-1,'복귀']],
 waterparkPool:[[-15,16],[-15,3],[-12.5,2.25],[-12.5,-9,6,'노랑 상단'],[-15,-12],[-15,3],[0,3],[0,-8,4.5,'성'],[0,3],[3,3],[16,11],[13.2,10.25],[13.2,-6,4.9,'초록 계단'],[10,-6,4.5,'초록 상단'],[16,-6],[16,12],[0,16,-1,'복귀']],
 aquarium:[[-9,-10,0,'먹이존'],[-3,-7],[-3,4,1,'큰 배'],[2,8,-1,'물속'],[12,-6],[8,-7,.4,'작은 배'],[12,-6],[12,-10],[0,-9,0,'복귀']],
 sunsetValley:[[0,-25,0,'노을'],[0,-6],[-11,-6],[-11,-13,1,'초록 능선'],[0,-6],[11,-6],[11,-13,1,'연두 능선'],[0,-6],[0,13,0,'복귀']],
 dolmenField:[[-8,2],[-8,-3],[-8,-6,2.85,'왼쪽 덮개돌'],[-8,2],[1,-8,1,'큰 바위'],[1,2],[9,2],[9,-5],[9,-8,2.85,'오른쪽 덮개돌'],[9,2],[0,14,0,'복귀']],
 dabotap:[[0,5,0,'정면 계단'],[0,-10,2,'기단'],[0,-11,4,'처마'],[0,-11,6,'상층'],[0,-10.92,8.8,'꼭대기 장식'],[0,5],[0,10,0,'복귀']],
 soccerField:[[-5,-5,0,'슈터'],[-14,-5],[-16,-4,3,'왼쪽 크로스바'],[-14,-5],[7,7,0,'골키퍼'],[14,5],[16,4,3,'오른쪽 크로스바'],[14,5],[0,12,0,'복귀']],
 weekendRoom:[[-10,8,0,'게임판'],[-8,5],[-8,-5],[1,-5,3.2,'책상'],[-8,-5],[-5,11],[11,11],[11,7,1,'침대'],[12,0,.1,'쿠션'],[14,11],[0,14,0,'복귀']],
 movingCity:[[-14,5,0,'오토바이'],[-14,10],[0,2],[0,-1,3,'택시 보닛'],[0,-3,5,'택시 지붕'],[0,-6,3,'트렁크'],[-12,-10],[3,-14,0,'빌딩 보기'],[16,-10],[14,4,0,'작은 차'],[14,12],[0,15,0,'복귀']],
 roadHome:[[0,10,0,'차단기 통과'],[2,-3,2.2,'보닛'],[0,-4,2.9,'자동차 지붕'],[8,-4],[0,-12,0,'난간'],[12,-12,0,'붉은 배 보기'],[16,14],[0,17,0,'복귀']],
 phoneBedroom:[[0,5,2,'침대'],[2,-1,2,'휴대전화'],[-7,5],[-11,7,1,'책상'],[-7,5],[-7,-9],[-10,-8,0,'책장 보기'],[-7,-11],[10,-12,0,'창문 보기'],[13,12],[0,14.5,0,'복귀']],
 dessertCafe:[[0,2,0,'숟가락 인물'],[-5.8,8],[-5.8,-4,6.5,'망고 정상'],[0,9],[5.8,8],[5.8,-4,6.5,'커피 정상'],[0,9],[0,15,0,'복귀']],
 chineseRestaurant:[[-7,12],[-7,8,1.5,'앞 식탁1'],[0,12],[7,12],[7,8,1.5,'앞 식탁2'],[0,3],[-7,0],[-7,-5,1.5,'뒤 식탁1'],[0,0],[7,0],[7,-5,1.5,'뒤 식탁2'],[14,-9,0,'직원'],[16,14],[0,16,0,'복귀']],
 bananaMilkRecord:[[-10,9,.2,'공책'],[-5.5,7],[-5.5,-1,4,'흰 계단'],[-2,-2,6.7,'초록 뚜껑'],[-8,-8,0,'도전자 보기'],[-8,-11],[9,-11,0,'소파 보기'],[15,12],[0,15,0,'복귀']],
 moonCrater:[[-9,-2,0,'큰 분화구'],[-5.8,-2,moonFloor(-5.8,-2)+.2,'큰 테두리'],[1,2,1,'중앙 분화구'],[3.5,2,moonFloor(3.5,2)+.2,'중앙 테두리'],[8,1,0,'오른쪽 분화구'],[10.2,1,moonFloor(10.2,1)+.2,'오른쪽 테두리'],[0,13,-1,'복귀']],
 constellationNight:[[0,-13],[-9,-13,1,'초승달'],[0,-13],[3,8],[9,-5,4,'로켓'],[0,8],[-10,4,0,'나무'],[8,1,0,'친구들'],[0,17,0,'복귀']],
};
for(const [key,points] of Object.entries(routes))test(`story round trip: ${key}`,()=>{
 const result=travel(key,points);const failure=result.find(p=>!p.reached);
 if(process.env.STORY_ROUTE_REPORT)console.log('ROUTE_AUDIT '+JSON.stringify({key,result}));
 assert.ok(!failure,JSON.stringify(failure));
 assert.equal(result.length,points.length);
});
