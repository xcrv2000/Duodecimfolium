export interface Dungeon {
  id: string;
  name: string;
  description: string;
  unlockRequirementId?: string; // 需要通过该地牢后才能解锁
  teamSize: number; // 允许的角色数量
  unlocksPackId?: string; // 首次通过解锁哪个卡包
  goldRewardMin: number;
  goldRewardMax: number;
  stages: DungeonStage[];
}

export interface DungeonStage {
  type: 'mob' | 'elite' | 'boss';
  enemyPoolId: string; // 敌人池ID
}

export interface Enemy {
  id: string;
  name: string;
  hpMin: number;
  hpMax: number;
  deck: string[]; // 卡牌ID列表 (e.g. ["thrust", "thrust", "charge"])
}
