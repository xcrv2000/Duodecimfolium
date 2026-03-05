import React, { useState, useEffect } from 'react';
import { Home, Swords, Layers, ShoppingBag, Settings, Book, PlayCircle, X } from 'lucide-react';
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
  const { state: battleState } = useBattleStore();
  const { gold, dust } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [notification, setNotification] = useState<{ title: string, message: string, type: 'success' | 'failure' } | null>(null);

  // Auto-navigate to battle when it starts?
  // Maybe not forced, but we can if the user was on "Dungeon" tab.
  // For now, let's keep it manual or user-initiated.
  
  const isBattleRunning = !!battleState;

  // Notification Logic
  useEffect(() => {
      if (battleState?.isOver) {
          // Check win/loss
          if (battleState.winner === 'player') {
              // If looping, we might not want to notify every single win unless it's the FINAL stage?
              // The store auto-advances.
              // We only notify if "Dungeon Cleared" which happens in nextStage logic.
              // Wait, battleStore handles "Dungeon Cleared" inside nextStage.
              // But here we only see the BATTLE state.
              
              // If we want to know if Dungeon is cleared, we need to check store state.
              // But battleStore clears state on exit/finish unless looping.
          } else if (battleState.winner === 'enemy') {
              // Defeat
              setNotification({
                  title: "挑战失败",
                  message: "你被击败了...",
                  type: 'failure'
              });
          }
      }
  }, [battleState?.isOver, battleState?.winner]);

  // We also need to know when a Dungeon is fully cleared.
  // We can listen to playerStore changes? Or add a callback/event?
  // Or just rely on the fact that battleState becomes null?
  
  // Let's stick to the requirement: "When dungeon challenge fails, OR dungeon cleared (and not looping), popup notification."
  
  const renderContent = () => {
    switch (activeTab) {
      case 'battle':
        return battleState ? <BattleView /> : <div className="p-8 text-center text-slate-400">当前没有进行中的战斗。</div>;
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
    <div className="flex h-[100dvh] bg-slate-950 text-white overflow-hidden font-sans relative">
      {/* Sidebar */}
      <div className="fixed inset-x-0 bottom-0 h-16 bg-slate-900 border-t border-slate-800 z-20 md:static md:h-auto md:w-20 md:border-r md:border-t-0 md:flex md:flex-col md:items-center md:py-4">
        <div className="mb-8 p-2 bg-emerald-600 rounded-full hidden md:block">
            <span className="font-bold text-xl">12</span>
        </div>
        
        <nav className="flex h-full w-full items-stretch justify-around md:h-auto md:flex-col md:justify-start md:gap-4">
          <NavItem icon={<Home />} label="主页" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<Swords />} label="地牢" isActive={activeTab === 'dungeon'} onClick={() => setActiveTab('dungeon')} />
          <NavItem icon={<Layers />} label="卡组" isActive={activeTab === 'collection'} onClick={() => setActiveTab('collection')} />
          <NavItem icon={<ShoppingBag />} label="商店" isActive={activeTab === 'gacha'} onClick={() => setActiveTab('gacha')} />
          <NavItem icon={<Book />} label="图鉴" isActive={activeTab === 'compendium'} onClick={() => setActiveTab('compendium')} />
          
          {isBattleRunning && (
              <div className="w-full md:mt-2 md:border-t md:border-slate-800 md:pt-2">
                 <NavItem 
                    icon={<PlayCircle className="text-red-500 animate-pulse" />} 
                    label="战斗中" 
                    isActive={activeTab === 'battle'} 
                    onClick={() => setActiveTab('battle')} 
                 />
              </div>
          )}

          <div className="md:mt-auto">
             <NavItem icon={<Settings />} label="设置" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Header (Resources) */}
        <div className="min-h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 py-2 sm:px-6">
            <div className="text-slate-400 text-xs sm:text-sm">Duodecimfolium</div>
            <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <span>Gold:</span>
                <span>{gold}</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400 font-bold">
                <span>Dust:</span>
                <span>{dust}</span>
            </div>
            </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto bg-slate-950 relative">
            {renderContent()}
        </div>
      </div>

      {/* Notification Popup */}
      {notification && (
          <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-auto sm:right-4 sm:w-80 bg-slate-800 border border-slate-700 shadow-xl rounded-lg overflow-hidden z-50 animate-in slide-in-from-right">
              <div className={`p-3 flex justify-between items-center ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  <span className="font-bold">{notification.title}</span>
                  <button onClick={() => setNotification(null)} className="hover:bg-white/20 rounded p-1">
                      <X size={16} />
                  </button>
              </div>
              <div className="p-4">
                  <p className="text-slate-300 mb-4">{notification.message}</p>
                  <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => {
                            setActiveTab('battle');
                            setNotification(null);
                        }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                      >
                          查看详情
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, disabled?: boolean }> = ({ icon, label, isActive, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`h-full min-w-0 px-1 py-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors md:h-auto md:w-full md:gap-1 md:p-3 ${
        isActive ? 'text-emerald-400 bg-slate-800/50 border-t-2 border-emerald-400 md:border-r-2 md:border-t-0' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {icon}
    <span className="text-[10px] leading-none">{label}</span>
  </button>
);

const HomeView: React.FC<{ onNavigate: (tab: Tab) => void }> = ({ onNavigate }) => (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-emerald-400">十二叶草 (Duodecimfolium)</h1>
        
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
            <h3 className="font-bold text-slate-300 mb-2">更新日志 (v0.2.3)</h3>
            <ul className="list-disc list-inside text-sm text-slate-400 mb-4">
                <li>手机适配</li>
                <li></li>
            </ul>

            <h3 className="font-bold text-slate-500 mb-2">更新日志 (v0.2.2)</h3>
            <ul className="list-disc list-inside text-xs text-slate-600">
                <li>buff重构</li>
                <li></li>
            </ul>

            <h3 className="font-bold text-slate-500 mb-2">更新日志 (v0.2.1)</h3>
            <ul className="list-disc list-inside text-xs text-slate-600">
                <li>大重构！</li>
                <li></li>
            </ul>

            <h3 className="font-bold text-slate-500 mb-2">更新日志 (v0.2.0)</h3>
            <ul className="list-disc list-inside text-xs text-slate-600">
                <li>新地牢：魔法学院来客</li>
                <li>新卡包：剑与魔法（30+ 新卡牌）</li>
                <li>新增修饰珠系统：火灵珠、冰灵珠、岩灵珠</li>
                <li>战斗系统重构：基于 0.1 精度的动态时间轴</li>
                <li>新增状态效果：燃烧、冰冻、眩晕、剑油等</li>
                <li></li>
            </ul>

            <h3 className="font-bold text-slate-500 mb-2 text-xs">历史版本 (v0.1.0)</h3>
            <ul className="list-disc list-inside text-xs text-slate-600">
                <li>基础战斗系统实装</li>
                <li>训练场地牢开放</li>
                <li>基础剑术卡包上架</li>
                <li></li>
            </ul>
        </div>
    </div>
);

export default MainLayout;
