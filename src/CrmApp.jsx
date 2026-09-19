import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import "./ClientV5.css";
import {
  Bell, ChevronRight, ChevronLeft, ClipboardList, Car, Headphones,
  SlidersHorizontal, Check, MessageSquare, CircleCheckBig, LoaderCircle,
  Clock3, CalendarDays, Plus, Save, UserRound, RefreshCw
} from "lucide-react";

const materialOptions = {
  "Пол": ["Ламинированная фанера", "Берёзовая фанера", "Алюминий"],
  "Стены": ["Ламинированная фанера", "Берёзовая фанера", "Композит"],
};
const statusInfo = {
  new: { label: "Новая заявка", icon: "🔵", step: 0 },
  approval: { label: "Согласование", icon: "🟡", step: 1 },
  production: { label: "Производство", icon: "🟠", step: 2 },
  installation: { label: "Установка", icon: "🟣", step: 3 },
  done: { label: "Готово", icon: "🟢", step: 4 },
  cancelled: { label: "Отменён", icon: "⚫", step: -1 },
};
const steps = ["Заявка", "Согласование", "Производство", "Установка", "Готово"];
const emptyVehicle = { brand: "", model: "", year: "", configuration: "", license_plate: "", vin: "" };
const formatPrice = (v) => `${new Intl.NumberFormat("ru-RU").format(Number(v || 0))} ₽`;
const formatDate = (v, withTime = false) => v ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(v)) : "";
const vehicleName = (v) => v ? [v.brand, v.model, v.configuration].filter(Boolean).join(" ") : "Автомобиль";

export default function App() {
  const [initData, setInitData] = useState("");
  const [booting, setBooting] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [screen, setScreen] = useState("configurator");
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [comment, setComment] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      setFatalError("Откройте GarageFlow через кнопку Mini App в Telegram. В обычном браузере защищённая авторизация недоступна.");
      setBooting(false);
      return;
    }
    tg.ready();
    tg.expand();
    setInitData(tg.initData);
    bootstrap(tg.initData);
  }, []);

  async function callClient(action, extra = {}, data = initData) {
    const { data: result, error } = await supabase.functions.invoke("client-api", { body: { action, init_data: data, ...extra } });
    if (error) throw new Error("Не удалось связаться с сервером.");
    if (!result?.success) throw new Error(result?.error || "Ошибка сервера");
    return result;
  }

  async function bootstrap(data = initData) {
    setBooting(true); setFatalError("");
    try {
      const result = await callClient("bootstrap", {}, data);
      setCustomer(result.customer);
      setProfilePhone(result.customer?.phone || "");
      setVehicles(result.vehicles || []);
      setSelectedVehicleId((current) => current && (result.vehicles || []).some(v => v.id === current) ? current : result.vehicles?.[0]?.id || null);
      setServices((result.services || []).map(s => ({ ...s, price: Number(s.base_price || 0), selected: false })));
      setOrders(result.orders || []);
    } catch (e) { setFatalError(e.message || "Ошибка запуска Mini App"); }
    finally { setBooting(false); }
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;
  const selectedServices = services.filter(s => s.selected);
  const total = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = (next) => { setScreen(next); goTop(); };

  function toggleService(id) {
    setServices(current => current.map(service => {
      if (service.id !== id) return service;
      const selected = !service.selected;
      if (selected && materialOptions[service.name]) setSelectedMaterials(m => ({ ...m, [id]: m[id] || materialOptions[service.name][0] }));
      if (!selected) setSelectedMaterials(m => { const n = { ...m }; delete n[id]; return n; });
      return { ...service, selected };
    }));
  }

  async function refreshData() { await bootstrap(); }

  async function submitOrder() {
    if (!selectedVehicle) return setOrderError("Сначала добавьте и выберите автомобиль.");
    if (!selectedServices.length) return setOrderError("Выберите хотя бы одну услугу.");
    setCreatingOrder(true); setOrderError("");
    try {
      const { data, error } = await supabase.functions.invoke("create-order", { body: {
        init_data: initData,
        vehicle_id: selectedVehicle.id,
        services: selectedServices.map(s => ({ service_id: s.id, material: selectedMaterials[s.id] || null })),
        customer_comment: comment,
      }});
      if (error) throw new Error("Не удалось отправить заявку.");
      if (!data?.success) throw new Error(data?.error || "Не удалось создать заявку.");
      setCreatedOrder({ id: data.order_id, total: Number(data.total) });
      await bootstrap();
      go("success");
    } catch (e) { setOrderError(e.message || "Ошибка создания заявки"); }
    finally { setCreatingOrder(false); }
  }

  async function saveVehicle() {
    setVehicleSaving(true); setOrderError("");
    try {
      const result = await callClient("save_vehicle", { vehicle: vehicleForm });
      await bootstrap();
      setSelectedVehicleId(result.vehicle.id);
      setVehicleForm(emptyVehicle);
      go("vehicles");
    } catch (e) { setOrderError(e.message); }
    finally { setVehicleSaving(false); }
  }

  async function saveProfile() {
    setProfileSaving(true); setOrderError("");
    try { const r = await callClient("save_profile", { phone: profilePhone }); setCustomer(r.customer); }
    catch (e) { setOrderError(e.message); }
    finally { setProfileSaving(false); }
  }

  function editVehicle(v) { setVehicleForm({ ...v, year: v.year || "" }); setOrderError(""); go("vehicle-edit"); }
  function newVehicle() { setVehicleForm(emptyVehicle); setOrderError(""); go("vehicle-edit"); }
  function resetOrder() {
    setServices(s => s.map(x => ({ ...x, selected: false })));
    setSelectedMaterials({}); setComment(""); setCreatedOrder(null); setOrderError(""); go("configurator");
  }

  function BottomNav({ active }) {
    return <nav className="bottomNav">
      <button className={active === "configurator" ? "navItem activeNav" : "navItem"} onClick={() => go("configurator")}><SlidersHorizontal size={21}/><span>Конфигуратор</span></button>
      <button className={active === "orders" ? "navItem activeNav" : "navItem"} onClick={() => go("orders")}><ClipboardList size={21}/><span>Заказы</span></button>
      <button className={active === "vehicles" ? "navItem activeNav" : "navItem"} onClick={() => go("vehicles")}><Car size={21}/><span>Автомобили</span></button>
      <button className={active === "profile" ? "navItem activeNav" : "navItem"} onClick={() => go("profile")}><UserRound size={21}/><span>Профиль</span></button>
    </nav>;
  }
  const Header = ({ subtitle }) => <header className="header"><div><div className="logo">Garage<span>Flow</span></div><div className="subtitle">{subtitle}</div></div><button className="iconButton" onClick={refreshData}><RefreshCw size={21}/></button></header>;

  if (booting) return <div className="app"><main><div className="gfState"><LoaderCircle className="gfSpin" size={34}/><h2>Запускаем GarageFlow</h2><p>Проверяем Telegram и загружаем ваши данные…</p></div></main></div>;
  if (fatalError) return <div className="app"><main><div className="gfState gfError"><h2>Не удалось открыть приложение</h2><p>{fatalError}</p></div></main></div>;

  if (screen === "profile") return <div className="app"><Header subtitle="Профиль клиента"/><main><section className="section"><div className="sectionHeader"><div><h2>{[customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Профиль"}</h2><p>{customer?.username ? `@${customer.username}` : "Telegram-пользователь"}</p></div><UserRound size={24}/></div><div className="serviceCard gfForm"><label>Телефон<input value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} placeholder="+7..."/></label><button className="continueButton" onClick={saveProfile} disabled={profileSaving}><Save size={18}/>{profileSaving ? "Сохраняем…" : "Сохранить"}</button>{orderError && <p className="gfErrorText">{orderError}</p>}</div></section></main><BottomNav active="profile"/></div>;

  if (screen === "vehicles") return <div className="app"><Header subtitle="Мои автомобили"/><main><section className="section"><div className="sectionHeader"><div><h2>Автомобили</h2><p>Выберите автомобиль для нового заказа</p></div><button className="iconButton" onClick={newVehicle}><Plus size={22}/></button></div>{!vehicles.length && <div className="serviceCard"><h3>Автомобилей пока нет</h3><p>Добавьте первый автомобиль.</p></div>}<div className="serviceList">{vehicles.map(v=><div key={v.id} className={v.id===selectedVehicleId?"serviceCard selected":"serviceCard"}><div className="serviceContent" onClick={()=>setSelectedVehicleId(v.id)}><div><div className="vehicleLabel">{v.id===selectedVehicleId?"ВЫБРАН":"АВТОМОБИЛЬ"}</div><h3>{vehicleName(v)}</h3><p>{[v.year, v.license_plate].filter(Boolean).join(" · ")}</p></div>{v.id===selectedVehicleId?<Check size={22}/>:<Car size={22}/>}</div><button className="gfTextButton" onClick={()=>editVehicle(v)}>Изменить</button></div>)}</div><button className="continueButton gfWide" onClick={newVehicle}><Plus size={19}/>Добавить автомобиль</button></section></main><BottomNav active="vehicles"/></div>;

  if (screen === "vehicle-edit") return <div className="app"><Header subtitle={vehicleForm.id?"Редактирование автомобиля":"Новый автомобиль"}/><main><button className="linkButton" onClick={()=>go("vehicles")}><ChevronLeft size={18}/>Назад</button><section className="section"><div className="serviceCard gfForm">{[["brand","Марка *"],["model","Модель *"],["year","Год"],["configuration","Конфигурация"],["license_plate","Госномер"],["vin","VIN"]].map(([key,label])=><label key={key}>{label}<input value={vehicleForm[key] ?? ""} onChange={e=>setVehicleForm(v=>({...v,[key]:e.target.value}))}/></label>)}{orderError&&<p className="gfErrorText">{orderError}</p>}<button className="continueButton" onClick={saveVehicle} disabled={vehicleSaving}><Save size={18}/>{vehicleSaving?"Сохраняем…":"Сохранить автомобиль"}</button></div></section></main><BottomNav active="vehicles"/></div>;

  if (screen === "orders") return <div className="app"><Header subtitle="История заявок"/><main><section className="section"><div className="sectionHeader"><div><h2>Мои заказы</h2><p>Данные синхронизированы с CRM</p></div><ClipboardList size={22}/></div>{!orders.length&&<div className="serviceCard"><h3>Заказов пока нет</h3><p>Создайте первую заявку в конфигураторе.</p></div>}<div className="serviceList">{orders.map(order=>{const st=statusInfo[order.status]||{label:order.status,icon:"⚪"};return <div key={order.id} className="serviceCard" onClick={()=>{setSelectedOrder(order);go("order-details")}}><div className="serviceContent"><div><div className="vehicleLabel">ЗАКАЗ №{order.id}</div><h3>{vehicleName(order.vehicle)}</h3><strong>{formatPrice(order.final_price??order.preliminary_price)}</strong><p>{st.icon} {st.label}</p></div><ChevronRight size={23}/></div></div>})}</div></section></main><BottomNav active="orders"/></div>;

  if (screen === "order-details" && selectedOrder) { const st=statusInfo[selectedOrder.status]||{label:selectedOrder.status,icon:"⚪",step:-1}; return <div className="app"><Header subtitle={`Заказ №${selectedOrder.id}`}/><main><button className="linkButton" onClick={()=>go("orders")}><ChevronLeft size={18}/>Все заказы</button><section className="vehicleCard"><div className="vehicleLabel">{st.icon} {st.label}</div><h1>{vehicleName(selectedOrder.vehicle)}</h1><p>{formatDate(selectedOrder.created_at)}</p></section>{selectedOrder.status!=="cancelled"&&<div className="gfProgress">{steps.map((s,i)=><div className={i<=st.step?"gfStep done":"gfStep"} key={s}><span>{i<st.step?"✓":i+1}</span><small>{s}</small></div>)}</div>}<section className="section"><div className="sectionHeader"><div><h2>Работы</h2><p>Состав заявки</p></div><ClipboardList size={22}/></div><div className="serviceList">{selectedOrder.items?.map(item=><div className="serviceCard" key={item.id}><div className="serviceContent"><div><h3>{item.service_name}</h3>{item.material&&<p>Материал: {item.material}</p>}</div><strong>{formatPrice(item.price)}</strong></div></div>)}</div></section>{selectedOrder.scheduled_at&&<section className="section"><div className="serviceCard"><h3>Запись</h3><p>{formatDate(selectedOrder.scheduled_at,true)}</p></div></section>}<section className="section"><div className="vehicleCard"><span>Стоимость</span><strong className="gfBigPrice">{formatPrice(selectedOrder.final_price??selectedOrder.preliminary_price)}</strong></div></section></main><BottomNav active="orders"/></div>; }

  if (screen === "success" && createdOrder) return <div className="app"><Header subtitle="Заявка отправлена"/><main><section className="vehicleCard gfSuccess"><CircleCheckBig size={70}/><div className="vehicleLabel">ЗАЯВКА СОЗДАНА</div><h1>Заказ №{createdOrder.id}</h1><p>Менеджер уже может работать с заявкой в GarageFlow CRM.</p><strong className="gfBigPrice">{formatPrice(createdOrder.total)}</strong><button className="continueButton gfWide" onClick={()=>go("orders")}>Мои заказы<ChevronRight size={20}/></button><button className="linkButton gfWide" onClick={resetOrder}>Новый заказ</button></section></main><BottomNav active="orders"/></div>;

  if (screen === "review") return <div className="app"><Header subtitle="Подтверждение заявки"/><main><button className="linkButton" onClick={()=>go("configurator")}><ChevronLeft size={18}/>Вернуться</button><section className="vehicleCard"><div className="vehicleLabel">ВАШ АВТОМОБИЛЬ</div><h1>{vehicleName(selectedVehicle)}</h1><p>{[selectedVehicle?.year,selectedVehicle?.license_plate].filter(Boolean).join(" · ")}</p></section><section className="section"><div className="sectionHeader"><div><h2>Ваш заказ</h2><p>Проверьте работы</p></div><ClipboardList size={22}/></div><div className="serviceList">{selectedServices.map(s=><div className="serviceCard" key={s.id}><div className="serviceContent"><div><h3>{s.name}</h3>{selectedMaterials[s.id]&&<p>Материал: {selectedMaterials[s.id]}</p>}</div><strong>{formatPrice(s.price)}</strong></div></div>)}</div></section><section className="section"><div className="serviceCard"><textarea className="gfTextarea" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий к заявке..." rows={5}/></div></section>{orderError&&<p className="gfErrorText">{orderError}</p>}</main><div className="totalBar"><div><span>Предварительно</span><strong>{formatPrice(total)}</strong></div><button className="continueButton" onClick={submitOrder} disabled={creatingOrder}>{creatingOrder?<><LoaderCircle size={20}/>Отправляем…</>:<>Оформить<ChevronRight size={20}/></>}</button></div><BottomNav active="configurator"/></div>;

  return <div className="app"><Header subtitle="Коммерческий транспорт"/><main><section className="vehicleCard"><div className="vehicleTop"><div><div className="vehicleLabel">МОЙ АВТОМОБИЛЬ</div>{selectedVehicle?<><h1>{vehicleName(selectedVehicle)}</h1><p>{[selectedVehicle.year,selectedVehicle.license_plate].filter(Boolean).join(" · ")}</p></>:<><h1>Добавьте автомобиль</h1><p>Он нужен для оформления заявки</p></>}</div><div className="vanIcon">🚐</div></div>{vehicles.length>1&&<select className="gfSelect" value={selectedVehicleId||""} onChange={e=>setSelectedVehicleId(Number(e.target.value))}>{vehicles.map(v=><option value={v.id} key={v.id}>{vehicleName(v)}</option>)}</select>}{!selectedVehicle&&<button className="continueButton gfWide" onClick={newVehicle}><Plus size={18}/>Добавить автомобиль</button>}</section><section className="section"><div className="sectionHeader"><div><h2>Выберите дооборудование</h2><p>Можно выбрать несколько вариантов</p></div><SlidersHorizontal size={22}/></div><div className="serviceList">{services.map(service=>{const materials=materialOptions[service.name];return <div key={service.id} className={service.selected?"serviceCard selected":"serviceCard"} onClick={()=>toggleService(service.id)}><div className="serviceContent"><div><h3>{service.name}</h3><strong>от {formatPrice(service.price)}</strong><p>{service.description}</p></div><div className={service.selected?"check selectedCheck":"check"}>{service.selected&&<Check size={19}/>}</div></div>{service.selected&&materials&&<div className="materials" onClick={e=>e.stopPropagation()}>{materials.map(m=><button key={m} type="button" className={selectedMaterials[service.id]===m?"material active":"material"} onClick={()=>setSelectedMaterials(x=>({...x,[service.id]:m}))}>{m}</button>)}</div>}</div>})}</div></section></main><div className="totalBar"><div><span>{selectedServices.length?`Выбрано: ${selectedServices.length}`:"Предварительно"}</span><strong>{formatPrice(total)}</strong></div><button className="continueButton" onClick={()=>{if(!selectedVehicle){go("vehicles");return;}if(selectedServices.length)go("review")}} disabled={!selectedServices.length&&!selectedVehicle}>{selectedVehicle?"Продолжить":"Автомобиль"}<ChevronRight size={20}/></button></div><BottomNav active="configurator"/></div>;
}
