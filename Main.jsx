import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  Utensils, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Search, 
  LogIn,
  LayoutDashboard,
  Palette,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

// --- Firebase Yapılandırması (Otomatik Tanımlanır) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'qr-menu-production';

// --- Global Sabitler ---
const DEFAULT_SETTINGS = {
  shopName: "Premium Gold Lounge",
  logoUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&h=200&fit=crop",
  primaryColor: "#D4AF37", 
  backgroundColor: "#000000",
  currency: "₺",
  adminPassword: "admin"
};

// --- Akıllı Resim Sıkıştırma Fonksiyonu (Yüksek Kaliteyi Korur, Boyutu Düşürür) ---
const optimizeAndEncodeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Genişliği 1200px ile sınırlar
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // %70 kalite ile JPEG formatına çevirir (Gözle görülür fark yaratmaz ama boyutu %90 düşürür)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Alt Bileşenler ---

const MenuView = ({ settings, categories, items, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, setView }) => {
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const goldStyle = { color: settings.primaryColor };
  const goldBg = { backgroundColor: settings.primaryColor };
  const borderGold = { borderColor: settings.primaryColor };

  return (
    <div className="min-h-screen pb-20 font-sans selection:bg-gold selection:text-black" style={{ backgroundColor: settings.backgroundColor, color: '#fff' }}>
      <header className="bg-black/90 backdrop-blur-xl border-b sticky top-0 z-50" style={{ borderColor: `${settings.primaryColor}44` }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 shadow-[0_0_20px_rgba(212,175,55,0.3)]" style={borderGold} />
            <h1 className="text-3xl font-black tracking-tighter" style={goldStyle}>{settings.shopName}</h1>
          </div>
          <button onClick={() => setView('admin-login')} className="p-3 text-gray-500 hover:text-white transition-all transform hover:rotate-90">
            <Settings size={28} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10">
        <div className="relative mb-12">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
          <input 
            type="text" 
            placeholder="Menüde arayın..."
            className="w-full pl-16 pr-6 py-6 rounded-3xl bg-white/5 border border-white/10 text-white text-xl focus:ring-2 outline-none transition-all shadow-2xl"
            style={{ focusRingColor: settings.primaryColor }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-10 py-4 rounded-full whitespace-nowrap text-xl font-black transition-all border ${selectedCategory === 'All' ? 'text-black border-transparent shadow-[0_10px_30px_rgba(212,175,55,0.4)]' : 'bg-transparent text-gray-500 border-white/10'}`}
            style={selectedCategory === 'All' ? goldBg : {}}
          >
            TÜMÜ
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-10 py-4 rounded-full whitespace-nowrap text-xl font-black transition-all border ${selectedCategory === cat.id ? 'text-black border-transparent shadow-[0_10px_30px_rgba(212,175,55,0.4)]' : 'bg-transparent text-gray-500 border-white/10'}`}
              style={selectedCategory === cat.id ? goldBg : {}}
            >
              {cat.name.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {filteredItems.length > 0 ? filteredItems.map(item => (
            <div key={item.id} className="bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] p-6 flex flex-col gap-6 border border-white/5 hover:border-white/20 transition-all shadow-2xl group">
              <div className="relative w-full aspect-square sm:aspect-video overflow-hidden rounded-[2.5rem]">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                   <span className="text-2xl font-black" style={goldStyle}>{item.price} {settings.currency}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 px-2">
                <h3 className="font-black text-white text-3xl tracking-tight leading-none" style={goldStyle}>{item.name}</h3>
                <p className="text-gray-400 text-xl leading-relaxed">{item.description}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-40 text-gray-700">
              <Utensils size={100} className="mx-auto mb-8 opacity-10" />
              <p className="text-2xl font-bold">Aradığınız kriterde ürün bulunamadı.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const AdminLogin = ({ settings, setView }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (pass === settings.adminPassword) setView('admin-panel');
    else setError('Giriş yetkiniz doğrulanmadı.');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <div className="bg-neutral-900 p-12 rounded-[3.5rem] shadow-[0_0_100px_rgba(212,175,55,0.1)] w-full max-w-lg text-center border border-white/5">
        <div className="w-28 h-28 bg-neutral-800 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-10 border border-[#D4AF37]/20 shadow-2xl">
          <LogIn size={48} />
        </div>
        <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">YÖNETİM</h2>
        <p className="text-neutral-500 text-xl mb-10 font-medium">Lütfen yönetici şifresini girin</p>
        <input 
          type="password" 
          placeholder="••••••••"
          className="w-full px-8 py-5 bg-neutral-800 border border-neutral-700 text-white text-center text-2xl rounded-3xl mb-6 outline-none focus:ring-4 focus:ring-[#D4AF37]/30 transition-all tracking-widest"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        {error && <p className="text-red-500 text-lg mb-6 font-bold">{error}</p>}
        <button onClick={handleLogin} className="w-full bg-[#D4AF37] text-black py-5 rounded-3xl font-black text-2xl hover:brightness-110 shadow-2xl transition-all active:scale-95 mb-6">
          SİSTEME GİRİŞ
        </button>
        <button onClick={() => setView('menu')} className="text-neutral-500 text-lg hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft size={20} /> Menüye Geri Dön
        </button>
      </div>
    </div>
  );
};

// --- Admin Panel Sekmeleri ---

const SettingsTab = ({ settings, appId }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), form);
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const optimized = await optimizeAndEncodeImage(file);
      setForm({ ...form, logoUrl: optimized });
    }
  };

  return (
    <div className="max-w-3xl bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100">
      <h2 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><Settings className="text-[#D4AF37]" size={36} /> GENEL AYARLAR</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">Dükkan Adı</label>
          <input value={form.shopName} onChange={e => setForm({...form, shopName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#D4AF37] text-xl font-bold" />
        </div>
        <div>
          <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">Para Birimi</label>
          <input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#D4AF37] text-xl font-bold" />
        </div>
      </div>
      
      <div className="mb-8">
        <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">Marka Logosu</label>
        <div className="flex items-center gap-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
          <img src={form.logoUrl} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl" alt="Logo" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 text-lg font-black text-white bg-black px-8 py-4 rounded-2xl hover:bg-neutral-800 transition-all">
            <Upload size={20} /> LOGO YÜKLE
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">Tema Rengi</label>
          <div className="flex gap-3">
            <input type="color" value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="h-16 w-20 rounded-2xl cursor-pointer border-none p-0 overflow-hidden" />
            <input value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xl font-mono uppercase" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">Giriş Şifresi</label>
          <input type="text" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#D4AF37] text-xl font-bold" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full bg-black text-[#D4AF37] py-6 rounded-3xl font-black text-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-50">
        {saving ? <Loader2 className="animate-spin" /> : <><Save size={28} /> TÜMÜNÜ KAYDET</>}
      </button>
    </div>
  );
};

const CategoriesTab = ({ categories, appId }) => {
  const [newCatName, setNewCatName] = useState('');

  const addCategory = async () => {
    if (!newCatName) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), { name: newCatName, createdAt: Date.now() });
    setNewCatName('');
  };

  return (
    <div className="max-w-3xl bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100">
      <h2 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><Palette className="text-[#D4AF37]" size={36} /> KATEGORİLER</h2>
      <div className="flex gap-4 mb-10">
        <input placeholder="Kategori Adı Yazın..." className="flex-grow p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xl font-bold focus:border-[#D4AF37]" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
        <button onClick={addCategory} className="bg-black text-[#D4AF37] px-8 py-5 rounded-2xl hover:bg-neutral-900 transition-all font-black text-xl"><Plus size={32} /></button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-200 hover:shadow-lg transition-all">
            <span className="text-2xl font-black text-slate-800">{cat.name.toUpperCase()}</span>
            <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'categories', cat.id))} className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
              <Trash2 size={24} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ItemsTab = ({ items, categories, appId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', categoryId: '', description: '', imageUrl: '' });
  const itemFileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const optimized = await optimizeAndEncodeImage(file);
      setForm({ ...form, imageUrl: optimized });
      setIsUploading(false);
    }
  };

  const saveItem = async () => {
    const itemsCol = collection(db, 'artifacts', appId, 'public', 'data', 'items');
    if (editingItem) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', editingItem.id), form);
    else await addDoc(itemsCol, { ...form, createdAt: Date.now() });
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-5xl bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4"><Utensils className="text-[#D4AF37]" size={36} /> ÜRÜN YÖNETİMİ</h2>
        <button onClick={() => { setEditingItem(null); setForm({ name: '', price: '', categoryId: categories[0]?.id || '', description: '', imageUrl: '' }); setIsModalOpen(true); }} className="bg-black text-[#D4AF37] px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-xl hover:scale-105 transition-all shadow-xl">
          <Plus size={24} /> ÜRÜN EKLE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 group">
            <div className="w-full aspect-square rounded-3xl overflow-hidden mb-4 shadow-md">
              <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-1">{item.name}</h4>
            <p className="text-lg font-black text-[#D4AF37] mb-4">{item.price} TL</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditingItem(item); setForm(item); setIsModalOpen(true); }} className="flex-grow py-3 bg-white text-slate-600 rounded-xl border font-bold hover:bg-slate-100">DÜZENLE</button>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id))} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100"><Trash2 size={20}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-slate-900">{editingItem ? 'ÜRÜNÜ GÜNCELLE' : 'YENİ ÜRÜN EKLE'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={32} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-8 mb-4">
                <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                  {isUploading ? <Loader2 className="animate-spin text-gold" size={40} /> : form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={48} />}
                </div>
                <div className="flex-grow">
                  <h5 className="font-black text-slate-800 mb-2">Ürün Görseli</h5>
                  <button onClick={() => itemFileInputRef.current?.click()} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center gap-2">
                    <Upload size={18} /> GÖRSEL SEÇ
                  </button>
                  <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <p className="text-sm text-slate-400 mt-2 font-medium italic">Sistem resminizi otomatik optimize eder.</p>
                </div>
              </div>

              <input placeholder="Ürün Adı" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xl font-bold focus:border-gold" />
              
              <div className="grid grid-cols-2 gap-6">
                <input placeholder="Fiyat" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xl font-bold focus:border-gold" />
                <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xl font-bold focus:border-gold">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                </select>
              </div>
              
              <textarea placeholder="Lezzet açıklaması ve içindekiler..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-32 text-xl font-medium focus:border-gold" />
              
              <button onClick={saveItem} disabled={isUploading} className="w-full bg-black text-[#D4AF37] py-6 rounded-[2rem] font-black text-2xl hover:brightness-110 shadow-2xl transition-all disabled:opacity-50">
                KAYDET VE YAYINLA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Ana Uygulama Gövdesi ---

export default function App() {
  const [view, setView] = useState('menu'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tab, setTab] = useState('settings');

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setSettings(snap.data());
      else setDoc(settingsRef, DEFAULT_SETTINGS);
    });

    const unsubCats = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'items'), (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubSettings(); unsubCats(); unsubItems(); };
  }, [user]);

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <Utensils size={80} className="text-[#D4AF37] animate-bounce" />
        <div className="absolute inset-0 bg-[#D4AF37]/20 blur-2xl rounded-full"></div>
      </div>
      <p className="text-[#D4AF37] font-black text-2xl tracking-[0.5em] animate-pulse">YÜKLENİYOR</p>
    </div>
  );

  if (view === 'admin-login') return <AdminLogin settings={settings} setView={setView} />;

  if (view === 'admin-panel') return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-80 bg-black text-white p-8 flex flex-col gap-10">
        <div className="flex items-center gap-4 px-2">
          <div className="bg-[#D4AF37] p-3 rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]"><LayoutDashboard size={32} /></div>
          <h1 className="font-black text-2xl tracking-tighter">PREMIUM<br/>YÖNETİM</h1>
        </div>
        <nav className="flex flex-col gap-4 mt-4">
          <button onClick={() => setTab('settings')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all text-xl font-black ${tab === 'settings' ? 'bg-[#D4AF37] text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Settings size={24} /> AYARLAR</button>
          <button onClick={() => setTab('categories')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all text-xl font-black ${tab === 'categories' ? 'bg-[#D4AF37] text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Palette size={24} /> KATEGORİLER</button>
          <button onClick={() => setTab('items')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all text-xl font-black ${tab === 'items' ? 'bg-[#D4AF37] text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Utensils size={24} /> ÜRÜNLER</button>
        </nav>
        <button onClick={() => setView('menu')} className="mt-auto flex items-center justify-center gap-3 px-6 py-5 rounded-[1.5rem] text-slate-400 hover:text-[#D4AF37] border-2 border-slate-800 hover:border-[#D4AF37] transition-all font-black text-xl"><ArrowLeft size={24} /> MENÜYE GİT</button>
      </aside>
      <main className="flex-grow p-8 md:p-12 overflow-y-auto max-h-screen bg-neutral-50">
        {tab === 'settings' && <SettingsTab settings={settings} appId={appId} />}
        {tab === 'categories' && <CategoriesTab categories={categories} appId={appId} />}
        {tab === 'items' && <ItemsTab items={menuItems} categories={categories} appId={appId} />}
      </main>
    </div>
  );

  return (
    <MenuView 
      settings={settings} 
      categories={categories} 
      items={menuItems} 
      searchTerm={searchTerm} 
      setSearchTerm={setSearchTerm} 
      selectedCategory={selectedCategory} 
      setSelectedCategory={setSelectedCategory} 
      setView={setView} 
    />
  );
}