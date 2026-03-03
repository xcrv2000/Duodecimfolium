import React, { useState } from 'react';
import { Home, Swords, Layers, ShoppingBag, Settings, Book } from 'lucide-react';
import BattleView from '../battle/BattleView';
import { useBattleStore } from '../../stores/battleStore';
import DungeonSelect from '../dungeoneering/DungeonSelect';
import GachaView from '../gacha/GachaView';
import CollectionView from '../collection/CollectionView';
import { usePlayerStore } from '../../stores/playerStore';

import SettingsView from '../settings/SettingsView';

import CompendiumView from '../compendium/CompendiumView';

type Tab = 'home' | 'battle' | 'dungeon' | 'collection' | 'gacha' | 'settings' | 'compendium';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { state: battleState } = useBattleStore();
  const { gold, dust } = usePlayerStore();

  // If in battle, force battle tab or show overlay?
  // For now, if battle is active, show battle view.
  const isInBattle = !!battleState;

  const renderContent = () => {
    if (isInBattle) return <BattleView />;

    switch (activeTab) {
      case 'home':
        return <HomeView onNavigate={setActiveTab} />;
      case 'dungeon':
        return <DungeonSelect onNavigate={setActiveTab} />;
      case 'collection':
        return <CollectionView onNavigate={setActiveTab} />;
      case 'gacha':
        return <GachaView onNavigate={setActiveTab} />;
      case 'compendium':
        return <CompendiumView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-4 border-r border-slate-800 z-10">
        <div className="mb-8 p-2 bg-emerald-600 rounded-full">
            <span className="font-bold text-xl">12</span>
        </div>
        
        <nav className="flex flex-col gap-4 w-full">
          <NavItem icon={<Home />} label="主页" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} disabled={isInBattle} />
          <NavItem icon={<Swords />} label="地牢" isActive={activeTab === 'dungeon'} onClick={() => setActiveTab('dungeon')} disabled={isInBattle} />
          <NavItem icon={<Layers />} label="卡组" isActive={activeTab === 'collection'} onClick={() => setActiveTab('collection')} disabled={isInBattle} />
          <NavItem icon={<ShoppingBag />} label="商店" isActive={activeTab === 'gacha'} onClick={() => setActiveTab('gacha')} disabled={isInBattle} />
          <NavItem icon={<Book />} label="图鉴" isActive={activeTab === 'compendium'} onClick={() => setActiveTab('compendium')} disabled={isInBattle} />
          <div className="mt-auto">
             <NavItem icon={<Settings />} label="设置" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} disabled={isInBattle} />
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header (Resources) */}
        {!isInBattle && (
            <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-end px-6 gap-6">
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                    <span>Gold:</span>
                    <span>{gold}</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <span>Dust:</span>
                    <span>{dust}</span>
                </div>
            </div>
        )}

        {/* Viewport */}
        <div className="flex-1 overflow-auto bg-slate-950 relative">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, disabled?: boolean }> = ({ icon, label, isActive, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`w-full p-3 flex flex-col items-center gap-1 transition-colors ${
        isActive ? 'text-emerald-400 bg-slate-800/50 border-r-2 border-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {icon}
    <span className="text-[10px]">{label}</span>
  </button>
);

const HomeView: React.FC<{ onNavigate: (tab: Tab) => void }> = ({ onNavigate }) => (
    <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-emerald-400">十二叶草 (Duodecimfolium)</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all group" onClick={() => onNavigate('dungeon')}>
                <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-400">冒险 (Adventure)</h2>
                <p className="text-slate-400">挑战地牢，获取金币与卡包。</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all group" onClick={() => onNavigate('gacha')}>
                <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-400">抽卡 (Gacha)</h2>
                <p className="text-slate-400">使用金币购买卡包，扩充你的卡池。</p>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all group" onClick={() => onNavigate('collection')}>
                <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-400">卡组 (Decks)</h2>
                <p className="text-slate-400">编辑卡组，合成卡牌。</p>
            </div>
        </div>

        <div className="mt-8 p-4 bg-slate-900/50 rounded border border-slate-800">
            <h3 className="font-bold text-slate-300 mb-2">更新日志 (v0.2.0)</h3>
            <ul className="list-disc list-inside text-sm text-slate-400 mb-4">
                <li>新地牢：魔法学院来客</li>
                <li>新卡包：剑与魔法（30+ 新卡牌）</li>
                <li>新增修饰珠系统：火灵珠、冰灵珠、岩灵珠</li>
                <li>战斗系统重构：基于 0.1 精度的动态时间轴</li>
                <li>新增状态效果：燃烧、冰冻、眩晕、剑油等</li>
            </ul>

            <h3 className="font-bold text-slate-500 mb-2 text-xs">历史版本 (v0.1.0)</h3>
            <ul className="list-disc list-inside text-xs text-slate-600">
                <li>基础战斗系统实装</li>
                <li>训练场地牢开放</li>
                <li>基础剑术卡包上架</li>
            </ul>
        </div>
    </div>
);

export default MainLayout;
