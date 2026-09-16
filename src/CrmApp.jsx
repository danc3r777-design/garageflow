import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import {
  LayoutDashboard, ClipboardList, Users, Car, CalendarDays, Package,
  BarChart3, Settings, LogOut, RefreshCw, Search, ChevronRight, X,
  CheckCircle2, Clock3, UserRound, Phone, AtSign, Hash, CalendarClock,
  CircleDollarSign, Wrench, ArrowRight, ChevronLeft, ChevronDown, AlertTriangle, TrendingUp, CalendarCheck,
} from "lucide-react";

const columns = [
  { key: "new", label: "Новая заявка" },
  { key: "approval", label: "Согласование" },
  { key: "production", label: "Производство" },
  { key: "installation", label: "Установка" },
  { key: "done", label: "Готово" },
];

const statusLabels = {
  new: "Новая заявка", approval: "Согласование", production: "Производство",
  installation: "Установка", done: "Готово", cancelled: "Отменён",
};

const pageMeta = {
  overview: ["Обзор", "Главное по GarageFlow на сегодня"],
  orders: ["Заказы", "Управление заявками GarageFlow"],
  customers: ["Клиенты", "Клиенты и история их заказов"],
  vehicles: ["Автомобили", "Автомобили клиентов GarageFlow"],
  calendar: ["Календарь", "Запланированные работы и установки"],
  analytics: ["Аналитика", "Показатели GarageFlow по реальным заказам"],
};

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₽";
}
function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
function formatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(value));
}
function getCustomerName(customer) {
  if (!customer) return "Клиент";
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.username || "Клиент";
}
function getVehicleName(vehicle) {
  if (!vehicle) return "Автомобиль не указан";
  return [vehicle.brand, vehicle.model, vehicle.configuration].filter(Boolean).join(" ");
}
function getDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}
function orderAmount(order) {
  return Number(order.final_price ?? order.preliminary_price ?? 0);
}

export default function CrmApp() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [employee, setEmployee] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activePage, setActivePage] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [editingOrder, setEditingOrder] = useState({ final_price: "", manager_comment: "", scheduled_at: "", priority: "normal" });
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setCheckingAuth(false);
      if (session) await loadOrders();
    }
    initialize();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, []);

  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }
  async function invokeCrmFunction(functionName, body = {}) {
    const token = await getAccessToken();
    if (!token) throw new Error("Сессия закончилась. Войдите снова.");
    const { data, error } = await supabase.functions.invoke(functionName, {
      body, headers: { Authorization: `Bearer ${token}` },
    });
    if (error) { console.error(functionName, error); throw new Error("Ошибка соединения с CRM."); }
    if (!data?.success) throw new Error(data?.error || "Ошибка CRM.");
    return data;
  }
  async function loadOrders() {
    setLoading(true); setError("");
    try {
      const data = await invokeCrmFunction("crm-orders");
      setEmployee(data.employee);
      setOrders(data.orders || []);
      if (selectedOrder) {
        const refreshed = (data.orders || []).find((o) => o.id === selectedOrder.id);
        if (refreshed) {
          setSelectedOrder(refreshed);
          setEditingOrder({
            final_price: refreshed.final_price ?? "",
            manager_comment: refreshed.manager_comment ?? "",
            scheduled_at: getDateTimeLocalValue(refreshed.scheduled_at),
            priority: refreshed.priority || "normal",
          });
        }
      }
    } catch (err) {
      console.error(err); setError(err instanceof Error ? err.message : "Ошибка загрузки CRM.");
    } finally { setLoading(false); }
  }
  async function login(event) {
    event.preventDefault(); setLoginLoading(true); setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session); await loadOrders();
    } catch (err) { console.error(err); setLoginError("Неверный email или пароль."); }
    finally { setLoginLoading(false); }
  }
  async function logout() {
    await supabase.auth.signOut(); setSession(null); setEmployee(null); setOrders([]); setSelectedOrder(null);
  }
  function openOrder(order) {
    setEditingOrder({
      final_price: order.final_price ?? "",
      manager_comment: order.manager_comment ?? "",
      scheduled_at: getDateTimeLocalValue(order.scheduled_at),
      priority: order.priority || "normal",
    });
    setSaveMessage(""); setError(""); setSelectedOrder(order);
  }
  function goToOrder(order) { setActivePage("orders"); openOrder(order); }

  async function changeStatus(order, status) {
    if (changingStatus || order.status === status) return;
    setChangingStatus(true); setError(""); setSaveMessage("");
    try {
      await invokeCrmFunction("crm-update-status", { order_id: order.id, status });
      setOrders((current) => current.map((o) => o.id === order.id ? { ...o, status } : o));
      if (selectedOrder?.id === order.id) setSelectedOrder((current) => ({ ...current, status }));
      setSaveMessage("Статус изменён");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось изменить статус."); }
    finally { setChangingStatus(false); }
  }
  async function saveOrderChanges() {
    if (!selectedOrder || savingOrder) return;
    setSavingOrder(true); setSaveMessage(""); setError("");
    try {
      let scheduledAt = null;
      if (editingOrder.scheduled_at) {
        const date = new Date(editingOrder.scheduled_at);
        if (Number.isNaN(date.getTime())) throw new Error("Проверьте дату и время записи.");
        scheduledAt = date.toISOString();
      }
      const data = await invokeCrmFunction("crm-update-order", {
        order_id: selectedOrder.id,
        final_price: editingOrder.final_price === "" ? null : Number(editingOrder.final_price),
        manager_comment: editingOrder.manager_comment,
        scheduled_at: scheduledAt,
        priority: editingOrder.priority || "normal",
      });
      const updated = { ...selectedOrder, ...data.order };
      setSelectedOrder(updated);
      setOrders((current) => current.map((o) => o.id === updated.id ? { ...o, ...data.order } : o));
      setEditingOrder({
        final_price: updated.final_price ?? "",
        manager_comment: updated.manager_comment ?? "",
        scheduled_at: getDateTimeLocalValue(updated.scheduled_at),
        priority: updated.priority || "normal",
      });
      setSaveMessage("Изменения сохранены");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось сохранить заказ."); }
    finally { setSavingOrder(false); }
  }
  async function cancelOrder() {
    if (!selectedOrder || savingOrder) return;
    if (!window.confirm(`Отменить заказ №${selectedOrder.id}?`)) return;
    setSavingOrder(true); setError(""); setSaveMessage("");
    try {
      const data = await invokeCrmFunction("crm-update-order", { order_id: selectedOrder.id, status: "cancelled" });
      setOrders((current) => current.map((o) => o.id === selectedOrder.id ? { ...o, ...data.order } : o));
      setSelectedOrder(null);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось отменить заказ."); }
    finally { setSavingOrder(false); }
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !q || [
        order.id, getCustomerName(order.customer), order.customer?.phone,
        getVehicleName(order.vehicle), order.vehicle?.license_plate,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || (order.priority || "normal") === priorityFilter;
      return matchesText && matchesStatus && matchesPriority;
    });
  }, [orders, search, statusFilter, priorityFilter]);

  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const c = order.customer;
      if (!c) return;
      const key = c.id ?? `customer-${getCustomerName(c)}-${c.phone || ""}`;
      const current = map.get(key) || { ...c, ordersCount: 0, total: 0, lastOrder: null, orders: [] };
      current.ordersCount += 1;
      if (order.status !== "cancelled") current.total += orderAmount(order);
      current.orders.push(order);
      if (!current.lastOrder || new Date(order.created_at) > new Date(current.lastOrder.created_at)) current.lastOrder = order;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => new Date(b.lastOrder?.created_at || 0) - new Date(a.lastOrder?.created_at || 0));
  }, [orders]);

  const vehicles = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const v = order.vehicle;
      if (!v) return;
      const key = v.id ?? `vehicle-${v.brand}-${v.model}-${v.license_plate || ""}`;
      const current = map.get(key) || { ...v, customer: order.customer, ordersCount: 0, total: 0, lastOrder: null, orders: [] };
      current.ordersCount += 1;
      if (order.status !== "cancelled") current.total += orderAmount(order);
      current.orders.push(order);
      if (!current.lastOrder || new Date(order.created_at) > new Date(current.lastOrder.created_at)) current.lastOrder = order;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => new Date(b.lastOrder?.created_at || 0) - new Date(a.lastOrder?.created_at || 0));
  }, [orders]);

  const scheduledOrders = useMemo(() => orders
    .filter((o) => o.scheduled_at && o.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)), [orders]);

  const calendarGroups = useMemo(() => {
    const groups = new Map();
    scheduledOrders.forEach((order) => {
      const d = new Date(order.scheduled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    return [...groups.entries()];
  }, [scheduledOrders]);

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + orderAmount(o), 0);
  const activeOrders = orders.filter((o) => !["done", "cancelled"].includes(o.status)).length;
  const newOrders = orders.filter((o) => o.status === "new").length;
  const doneOrders = orders.filter((o) => o.status === "done").length;
  const upcoming = scheduledOrders.filter((o) => new Date(o.scheduled_at) >= new Date()).slice(0, 5);
  const recent = [...orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled");
  const averageCheck = nonCancelledOrders.length ? totalRevenue / nonCancelledOrders.length : 0;
  const completionRate = nonCancelledOrders.length ? Math.round((doneOrders / nonCancelledOrders.length) * 100) : 0;
  const urgentOrders = orders.filter((o) => o.status !== "cancelled" && o.priority === "urgent");
  const highPriorityOrders = orders.filter((o) => o.status !== "cancelled" && o.priority === "high");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const todayOrders = scheduledOrders.filter((o) => { const d = new Date(o.scheduled_at); return d >= todayStart && d < todayEnd; });
  const weekOrders = scheduledOrders.filter((o) => { const d = new Date(o.scheduled_at); return d >= todayStart && d < weekEnd; });
  const overdueOrders = scheduledOrders.filter((o) => new Date(o.scheduled_at) < now && !["done", "cancelled"].includes(o.status));

  const serviceStats = useMemo(() => {
    const map = new Map();
    nonCancelledOrders.forEach((order) => (order.items || []).forEach((item) => {
      const key = item.service_name || "Без названия";
      const current = map.get(key) || { name: key, count: 0, revenue: 0 };
      current.count += Number(item.quantity || 1);
      current.revenue += Number(item.price || 0) * Number(item.quantity || 1);
      map.set(key, current);
    }));
    return [...map.values()].sort((a,b) => b.count - a.count).slice(0, 6);
  }, [orders]);

  const monthlyStats = useMemo(() => {
    const result = [];
    const base = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(base.getFullYear(), base.getMonth() - offset, 1);
      const year = d.getFullYear(), month = d.getMonth();
      const monthOrders = nonCancelledOrders.filter((o) => { const x = new Date(o.created_at); return x.getFullYear() === year && x.getMonth() === month; });
      result.push({
        key: `${year}-${month}`,
        label: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(d),
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum,o) => sum + orderAmount(o), 0),
      });
    }
    return result;
  }, [orders]);
  const maxMonthlyRevenue = Math.max(1, ...monthlyStats.map((m) => m.revenue));
  const funnel = columns.map((column) => ({ ...column, count: orders.filter((o) => o.status === column.key).length }));
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.count));

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const mondayOffset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < mondayOffset; i += 1) cells.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOrders = scheduledOrders.filter((order) => {
        const d = new Date(order.scheduled_at);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });
      cells.push({ date, key, day, orders: dayOrders });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth, scheduledOrders]);

  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(calendarMonth);
  const selectedDayOrders = selectedCalendarDay
    ? calendarDays.find((cell) => cell?.key === selectedCalendarDay)?.orders || []
    : [];
  const [pageTitle, pageSubtitle] = pageMeta[activePage] || pageMeta.overview;

  if (checkingAuth) return <div className="crmLoginPage"><div className="crmLoginCard"><div className="crmBrand">Garage<span>Flow</span></div><p>Проверяем сессию...</p></div></div>;
  if (!session) return (
    <div className="crmLoginPage"><form className="crmLoginCard" onSubmit={login}>
      <div className="crmBrand">Garage<span>Flow</span></div><div className="crmLoginSubtitle">CRM для сотрудников</div>
      <h1>Вход в систему</h1>
      <label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="manager@company.ru" required /></label>
      <label>Пароль<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required /></label>
      {loginError && <div className="crmError">{loginError}</div>}
      <button className="crmPrimaryButton" type="submit" disabled={loginLoading}>{loginLoading ? "Входим..." : "Войти"}</button>
    </form></div>
  );

  const menu = [
    ["overview", LayoutDashboard, "Обзор"], ["orders", ClipboardList, "Заказы"],
    ["customers", Users, "Клиенты"], ["vehicles", Car, "Автомобили"], ["calendar", CalendarDays, "Календарь"],
    ["analytics", BarChart3, "Аналитика"],
  ];

  return (
    <div className="crm">
      <aside className="crmSidebar">
        <div className="crmBrand crmSidebarBrand">Garage<span>Flow</span></div>
        <div className="crmSidebarSubtitle">SERVICE CRM</div>
        <nav className="crmMenu">
          {menu.map(([key, Icon, label]) => (
            <button key={key} type="button" className={`crmMenuItem ${activePage === key ? "crmMenuItemActive" : ""}`} onClick={()=>{setActivePage(key); setSearch("");}}>
              <Icon size={19}/>{label}
            </button>
          ))}
          <button className="crmMenuItem crmMenuItemDisabled" type="button"><Package size={19}/>Склад <small>скоро</small></button>
          <button className="crmMenuItem crmMenuItemDisabled" type="button"><Settings size={19}/>Настройки <small>скоро</small></button>
        </nav>
        <div className="crmSidebarBottom">
          <div className="crmEmployee"><div className="crmAvatar"><UserRound size={19}/></div><div><strong>{employee?.display_name || "Сотрудник"}</strong><span>{employee?.role}</span></div></div>
          <button className="crmLogout" type="button" onClick={logout}><LogOut size={18}/>Выйти</button>
        </div>
      </aside>

      <main className="crmMain">
        <header className="crmTopbar"><div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
          <button type="button" className="crmRefresh" onClick={loadOrders} disabled={loading}><RefreshCw size={18}/>Обновить</button>
        </header>
        {error && <div className="crmError crmPageError">{error}</div>}
        {loading ? <div className="crmLoading">Загружаем данные...</div> : <>

          {activePage === "overview" && <>
            <section className="crmStats crmStatsFive">
              <div className="crmStat"><span>Новые заявки</span><strong>{newOrders}</strong></div>
              <div className="crmStat"><span>В работе</span><strong>{activeOrders}</strong></div>
              <div className="crmStat"><span>Завершено</span><strong>{doneOrders}</strong></div>
              <div className="crmStat"><span>Клиентов</span><strong>{customers.length}</strong></div>
              <div className="crmStat"><span>Сумма заказов</span><strong>{formatPrice(totalRevenue)}</strong></div>
            </section>
            <section className="crmAttentionGrid">
              <button type="button" className={`crmAttentionCard ${todayOrders.length ? "crmAttentionCardActive" : ""}`} onClick={()=>setActivePage("calendar")}><CalendarCheck size={21}/><div><span>Сегодня</span><strong>{todayOrders.length} записей</strong></div></button>
              <button type="button" className={`crmAttentionCard ${weekOrders.length ? "crmAttentionCardActive" : ""}`} onClick={()=>setActivePage("calendar")}><CalendarDays size={21}/><div><span>Ближайшие 7 дней</span><strong>{weekOrders.length} записей</strong></div></button>
              <button type="button" className={`crmAttentionCard ${overdueOrders.length ? "crmAttentionCardWarning" : ""}`} onClick={()=>setActivePage("orders")}><AlertTriangle size={21}/><div><span>Требуют внимания</span><strong>{overdueOrders.length} просрочено</strong></div></button>
              <button type="button" className={`crmAttentionCard ${urgentOrders.length ? "crmAttentionCardUrgent" : ""}`} onClick={()=>{setActivePage("orders");setPriorityFilter("urgent");}}><TrendingUp size={21}/><div><span>Срочные</span><strong>{urgentOrders.length} заказов</strong></div></button>
            </section>
            <section className="crmFunnelPanel">
              <div className="crmPanelHeader"><div><h2>Воронка заказов</h2><p>Распределение по текущим статусам</p></div><BarChart3 size={20}/></div>
              <div className="crmFunnel">{funnel.map((item)=><div className="crmFunnelItem" key={item.key}><div className="crmFunnelTop"><span>{item.label}</span><strong>{item.count}</strong></div><div className="crmFunnelTrack"><div className="crmFunnelFill" style={{width:`${Math.max(item.count ? 12 : 0, (item.count/maxFunnel)*100)}%`}}/></div></div>)}</div>
            </section>
            <section className="crmDashboardGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Ближайшие записи</h2><p>Назначенные работы</p></div><CalendarClock size={20}/></div>
                <div className="crmList">{upcoming.length ? upcoming.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmListIcon"><CalendarDays size={18}/></div><div className="crmListMain"><strong>{getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · {formatDate(o.scheduled_at)}</span></div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">Ближайших записей пока нет</div>}</div>
              </div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Последние заказы</h2><p>Недавняя активность</p></div><ClipboardList size={20}/></div>
                <div className="crmList">{recent.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmListIcon"><Hash size={18}/></div><div className="crmListMain"><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{statusLabels[o.status] || o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={18}/></button>)}</div>
              </div>
            </section>
            <section className="crmQuickGrid">
              <button onClick={()=>setActivePage("orders")}><Wrench size={21}/><div><strong>Открыть заказы</strong><span>Kanban и карточки работ</span></div><ArrowRight size={18}/></button>
              <button onClick={()=>setActivePage("customers")}><Users size={21}/><div><strong>База клиентов</strong><span>{customers.length} клиентов</span></div><ArrowRight size={18}/></button>
              <button onClick={()=>setActivePage("calendar")}><CalendarClock size={21}/><div><strong>Календарь</strong><span>{scheduledOrders.length} записей</span></div><ArrowRight size={18}/></button>
            </section>
          </>}

          {activePage === "orders" && <>
            <section className="crmStats"><div className="crmStat"><span>Всего заказов</span><strong>{orders.length}</strong></div><div className="crmStat"><span>В работе</span><strong>{activeOrders}</strong></div><div className="crmStat"><span>Завершено</span><strong>{doneOrders}</strong></div><div className="crmStat"><span>Сумма заказов</span><strong>{formatPrice(totalRevenue)}</strong></div></section>
            <section className="crmToolbar crmToolbarSplit"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск по клиенту, автомобилю, номеру..."/></div><div className="crmOrderFilters"><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="all">Все статусы</option>{columns.map((c)=><option key={c.key} value={c.key}>{c.label}</option>)}</select><select value={priorityFilter} onChange={(e)=>setPriorityFilter(e.target.value)}><option value="all">Все приоритеты</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select><button className={`crmFilterButton ${showCancelled ? "crmFilterButtonActive" : ""}`} type="button" onClick={()=>setShowCancelled((value)=>!value)}>Отменённые <span>{cancelledOrders.length}</span><ChevronDown size={16}/></button></div></section>
            {showCancelled && <section className="crmCancelledPanel"><div className="crmPanelHeader"><div><h2>Отменённые заказы</h2><p>История отменённых заявок</p></div></div><div className="crmList">{cancelledOrders.length ? cancelledOrders.map((o)=><button className="crmListRow" key={o.id} onClick={()=>openOrder(o)}><div className="crmListIcon"><Hash size={18}/></div><div className="crmListMain"><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">Отменённых заказов нет</div>}</div></section>}
            <section className="crmBoard">{columns.map((column)=>{const columnOrders=filteredOrders.filter((o)=>o.status===column.key); return <div className="crmColumn" key={column.key}><div className="crmColumnHeader"><span>{column.label}</span><strong>{columnOrders.length}</strong></div><div className="crmColumnCards">{columnOrders.map((o)=><article key={o.id} className="crmOrderCard" onClick={()=>openOrder(o)}><div className="crmOrderTop"><span>Заказ №{o.id}</span><div className="crmOrderTopRight">{o.priority && o.priority!=="normal" && <span className={`crmPriorityBadge crmPriority-${o.priority}`}>{o.priority==="urgent"?"Срочный":"Высокий"}</span>}<ChevronRight size={17}/></div></div><h3>{getVehicleName(o.vehicle)}</h3><p className="crmCustomerName">{getCustomerName(o.customer)}</p><div className="crmServices">{o.items?.map((i)=>i.service_name).join(" • ")}</div>{o.scheduled_at&&<div className="crmOrderSchedule"><Clock3 size={14}/>{formatDate(o.scheduled_at)}</div>}<div className="crmOrderBottom"><strong>{formatPrice(orderAmount(o))}</strong><span>{formatDate(o.created_at)}</span></div></article>)}{!columnOrders.length&&<div className="crmEmptyColumn">Нет заказов</div>}</div></div>})}</section>
          </>}

          {activePage === "customers" && <section className="crmDataSection">
            <div className="crmToolbar"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск клиента..."/></div></div>
            <div className="crmDataGrid">{customers.filter((c)=>!search.trim() || [getCustomerName(c),c.phone,c.username].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).map((c)=><button className="crmDataCard crmDataCardButton" key={c.id ?? getCustomerName(c)} onClick={()=>setSelectedCustomer(c)}><div className="crmDataCardHead"><div className="crmDataAvatar"><UserRound size={20}/></div><div><h3>{getCustomerName(c)}</h3><span>{c.ordersCount} заказ(а)</span></div></div><div className="crmDataInfo">{c.phone&&<div><Phone size={15}/>{c.phone}</div>}{c.username&&<div><AtSign size={15}/>@{c.username}</div>}<div><CircleDollarSign size={15}/>{formatPrice(c.total)}</div></div><div className="crmCardLink">Открыть карточку клиента<ChevronRight size={16}/></div></button>)}</div>
          </section>}

          {activePage === "vehicles" && <section className="crmDataSection">
            <div className="crmToolbar"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск автомобиля или госномера..."/></div></div>
            <div className="crmDataGrid">{vehicles.filter((v)=>!search.trim() || [getVehicleName(v),v.license_plate,v.vin,getCustomerName(v.customer)].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).map((v)=><button className="crmDataCard crmDataCardButton" key={v.id ?? getVehicleName(v)} onClick={()=>setSelectedVehicle(v)}><div className="crmDataCardHead"><div className="crmDataAvatar"><Car size={20}/></div><div><h3>{getVehicleName(v)}</h3><span>{v.year || "Год не указан"}</span></div></div><div className="crmDataInfo"><div><UserRound size={15}/>{getCustomerName(v.customer)}</div>{v.license_plate&&<div><Hash size={15}/>{v.license_plate}</div>}<div><ClipboardList size={15}/>{v.ordersCount} заказ(а)</div><div><CircleDollarSign size={15}/>{formatPrice(v.total)}</div></div><div className="crmCardLink">Открыть карточку автомобиля<ChevronRight size={16}/></div></button>)}</div>
          </section>}

          {activePage === "calendar" && <section className="crmMonthSection">
            <div className="crmCalendarSummary"><div><span>Сегодня</span><strong>{todayOrders.length}</strong></div><div><span>Ближайшие 7 дней</span><strong>{weekOrders.length}</strong></div><div className={overdueOrders.length?"crmCalendarAlert":""}><span>Просроченные</span><strong>{overdueOrders.length}</strong></div></div>
            <div className="crmMonthToolbar"><button type="button" onClick={()=>{setCalendarMonth((d)=>new Date(d.getFullYear(),d.getMonth()-1,1));setSelectedCalendarDay(null);}}><ChevronLeft size={18}/></button><h2>{monthTitle}</h2><button type="button" onClick={()=>{setCalendarMonth((d)=>new Date(d.getFullYear(),d.getMonth()+1,1));setSelectedCalendarDay(null);}}><ChevronRight size={18}/></button></div>
            <div className="crmWeekdays">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day)=><span key={day}>{day}</span>)}</div>
            <div className="crmMonthGrid">{calendarDays.map((cell,index)=>cell ? <button type="button" key={cell.key} className={`crmMonthDay ${cell.orders.length ? "crmMonthDayBusy" : ""} ${selectedCalendarDay===cell.key ? "crmMonthDaySelected" : ""}`} onClick={()=>setSelectedCalendarDay(cell.key)}><span className="crmMonthNumber">{cell.day}</span>{cell.orders.slice(0,2).map((o)=><span className="crmMonthEvent" key={o.id}>{new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.scheduled_at))} · {getVehicleName(o.vehicle)}</span>)}{cell.orders.length>2&&<small>+ ещё {cell.orders.length-2}</small>}</button> : <div className="crmMonthDay crmMonthDayEmpty" key={`empty-${index}`}/>)}</div>
            <div className="crmDayAgenda"><div className="crmPanelHeader"><div><h2>{selectedCalendarDay ? `Записи на ${new Date(`${selectedCalendarDay}T12:00:00`).toLocaleDateString("ru-RU")}` : "Выберите день"}</h2><p>{selectedCalendarDay ? `${selectedDayOrders.length} записей` : "Нажмите на день в календаре"}</p></div><CalendarClock size={20}/></div>{selectedCalendarDay && <div className="crmList">{selectedDayOrders.length ? selectedDayOrders.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmCalendarTime">{new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.scheduled_at))}</div><div className="crmListMain"><strong>{getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · Заказ №{o.id}</span></div><div className="crmCalendarStatus">{statusLabels[o.status]||o.status}</div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">На этот день записей нет</div>}</div>}</div>
          </section>}

          {activePage === "analytics" && <>
            <section className="crmStats crmStatsFive">
              <div className="crmStat"><span>Выручка</span><strong>{formatPrice(totalRevenue)}</strong></div>
              <div className="crmStat"><span>Средний чек</span><strong>{formatPrice(averageCheck)}</strong></div>
              <div className="crmStat"><span>Заказов</span><strong>{nonCancelledOrders.length}</strong></div>
              <div className="crmStat"><span>Завершено</span><strong>{doneOrders}</strong></div>
              <div className="crmStat"><span>Завершение</span><strong>{completionRate}%</strong></div>
            </section>
            <section className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Выручка по месяцам</h2><p>Последние 6 месяцев</p></div><TrendingUp size={20}/></div><div className="crmRevenueChart">{monthlyStats.map((m)=><div className="crmRevenueColumn" key={m.key}><div className="crmRevenueValue">{m.revenue ? formatPrice(m.revenue) : "0 ₽"}</div><div className="crmRevenueBarWrap"><div className="crmRevenueBar" style={{height:`${Math.max(m.revenue ? 10 : 2,(m.revenue/maxMonthlyRevenue)*100)}%`}}/></div><strong>{m.label}</strong><span>{m.orders} заказ.</span></div>)}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Популярные услуги</h2><p>По количеству в заказах</p></div><Wrench size={20}/></div><div className="crmServiceStats">{serviceStats.length ? serviceStats.map((item,index)=><div className="crmServiceStat" key={item.name}><div className="crmServiceRank">{index+1}</div><div><strong>{item.name}</strong><span>{item.count} шт. · {formatPrice(item.revenue)}</span></div></div>) : <div className="crmEmptyState">Пока недостаточно данных</div>}</div></div>
            </section>
            <section className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Статусы заказов</h2><p>Текущая загрузка</p></div><BarChart3 size={20}/></div><div className="crmFunnel">{funnel.map((item)=><div className="crmFunnelItem" key={item.key}><div className="crmFunnelTop"><span>{item.label}</span><strong>{item.count}</strong></div><div className="crmFunnelTrack"><div className="crmFunnelFill" style={{width:`${Math.max(item.count?12:0,(item.count/maxFunnel)*100)}%`}}/></div></div>)}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Контроль работы</h2><p>Что требует внимания</p></div><AlertTriangle size={20}/></div><div className="crmControlStats"><div><span>Срочные заказы</span><strong>{urgentOrders.length}</strong></div><div><span>Высокий приоритет</span><strong>{highPriorityOrders.length}</strong></div><div><span>Просроченные записи</span><strong>{overdueOrders.length}</strong></div><div><span>Отменённые</span><strong>{cancelledOrders.length}</strong></div></div></div>
            </section>
          </>}
        </>}
      </main>

      {selectedCustomer && <div className="crmModalBackdrop" onClick={()=>setSelectedCustomer(null)}><div className="crmModal crmEntityModal" onClick={(e)=>e.stopPropagation()}><button className="crmModalClose" type="button" onClick={()=>setSelectedCustomer(null)}><X size={21}/></button><div className="crmOrderNumber">КАРТОЧКА КЛИЕНТА</div><h2>{getCustomerName(selectedCustomer)}</h2><p className="crmModalCustomer">{selectedCustomer.ordersCount} заказ(а) · {formatPrice(selectedCustomer.total)}</p><div className="crmEntityFacts">{selectedCustomer.phone&&<div><Phone size={17}/><span>Телефон</span><strong>{selectedCustomer.phone}</strong></div>}{selectedCustomer.username&&<div><AtSign size={17}/><span>Telegram</span><strong>@{selectedCustomer.username}</strong></div>}</div><div className="crmModalSection"><span className="crmModalLabel">Автомобили</span><div className="crmModalItems">{vehicles.filter((v)=>v.customer?.id===selectedCustomer.id).map((v)=><button className="crmEntityRow" key={v.id} onClick={()=>{setSelectedCustomer(null);setSelectedVehicle(v);}}><Car size={17}/><div><strong>{getVehicleName(v)}</strong><span>{v.license_plate||"Госномер не указан"}</span></div><ChevronRight size={17}/></button>)}</div></div><div className="crmModalSection"><span className="crmModalLabel">История заказов</span><div className="crmModalItems">{[...(selectedCustomer.orders||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((o)=><button className="crmEntityRow" key={o.id} onClick={()=>{setSelectedCustomer(null);goToOrder(o);}}><ClipboardList size={17}/><div><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{statusLabels[o.status]||o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={17}/></button>)}</div></div></div></div>}

      {selectedVehicle && <div className="crmModalBackdrop" onClick={()=>setSelectedVehicle(null)}><div className="crmModal crmEntityModal" onClick={(e)=>e.stopPropagation()}><button className="crmModalClose" type="button" onClick={()=>setSelectedVehicle(null)}><X size={21}/></button><div className="crmOrderNumber">КАРТОЧКА АВТОМОБИЛЯ</div><h2>{getVehicleName(selectedVehicle)}</h2><p className="crmModalCustomer">{getCustomerName(selectedVehicle.customer)} · {selectedVehicle.ordersCount} заказ(а)</p><div className="crmEntityFacts"><div><Car size={17}/><span>Год</span><strong>{selectedVehicle.year||"Не указан"}</strong></div>{selectedVehicle.license_plate&&<div><Hash size={17}/><span>Госномер</span><strong>{selectedVehicle.license_plate}</strong></div>}{selectedVehicle.vin&&<div><Hash size={17}/><span>VIN</span><strong>{selectedVehicle.vin}</strong></div>}<div><CircleDollarSign size={17}/><span>Сумма работ</span><strong>{formatPrice(selectedVehicle.total)}</strong></div></div><div className="crmModalSection"><span className="crmModalLabel">История работ</span><div className="crmModalItems">{[...(selectedVehicle.orders||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((o)=><button className="crmEntityRow" key={o.id} onClick={()=>{setSelectedVehicle(null);goToOrder(o);}}><Wrench size={17}/><div><strong>Заказ №{o.id}</strong><span>{o.items?.map((i)=>i.service_name).join(" • ")||"Работы не указаны"}</span><span>{statusLabels[o.status]||o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={17}/></button>)}</div></div></div></div>}

      {selectedOrder && <div className="crmModalBackdrop" onClick={()=>setSelectedOrder(null)}><div className="crmModal" onClick={(e)=>e.stopPropagation()}>
        <button className="crmModalClose" type="button" onClick={()=>setSelectedOrder(null)}><X size={21}/></button>
        <div className="crmOrderNumber">ЗАКАЗ №{selectedOrder.id}</div><h2>{getVehicleName(selectedOrder.vehicle)}</h2><p className="crmModalCustomer">{getCustomerName(selectedOrder.customer)}{selectedOrder.customer?.phone && ` · ${selectedOrder.customer.phone}`}</p>
        <div className="crmModalSection"><span className="crmModalLabel">Текущий статус</span><strong>{statusLabels[selectedOrder.status] || selectedOrder.status}</strong></div>
        <div className="crmModalSection"><span className="crmModalLabel">Изменить статус</span><div className="crmStatusButtons">{columns.map((column)=><button key={column.key} type="button" disabled={changingStatus||savingOrder} className={selectedOrder.status===column.key?"crmStatusButton crmStatusButtonActive":"crmStatusButton"} onClick={()=>changeStatus(selectedOrder,column.key)}>{selectedOrder.status===column.key&&<CheckCircle2 size={15}/>} {column.label}</button>)}</div></div>
        <div className="crmModalSection"><span className="crmModalLabel">Работы</span><div className="crmModalItems">{selectedOrder.items?.map((item)=><div key={item.id} className="crmModalItem"><div><strong>{item.service_name}</strong>{item.material&&<span>{item.material}</span>}</div><strong>{formatPrice(item.price)}</strong></div>)}</div></div>
        {selectedOrder.customer_comment&&<div className="crmModalSection"><span className="crmModalLabel">Комментарий клиента</span><p>{selectedOrder.customer_comment}</p></div>}
        <div className="crmModalSection"><span className="crmModalLabel">Приоритет заказа</span><div className="crmPriorityChoices">{[["normal","Обычный"],["high","Высокий"],["urgent","Срочный"]].map(([key,label])=><button type="button" key={key} className={`crmPriorityChoice crmPriorityChoice-${key} ${editingOrder.priority===key?"crmPriorityChoiceActive":""}`} onClick={()=>setEditingOrder((c)=>({...c,priority:key}))}>{label}</button>)}</div></div>
        <div className="crmModalSection"><span className="crmModalLabel">Дата и время записи</span><input className="crmEditInput" type="datetime-local" value={editingOrder.scheduled_at} onChange={(e)=>setEditingOrder((c)=>({...c,scheduled_at:e.target.value}))}/></div>
        <div className="crmModalSection"><span className="crmModalLabel">Итоговая стоимость</span><div className="crmPriceInputWrap"><input className="crmEditInput" type="number" min="0" step="1" value={editingOrder.final_price} onChange={(e)=>setEditingOrder((c)=>({...c,final_price:e.target.value}))} placeholder="Например, 52000"/><span>₽</span></div></div>
        <div className="crmModalSection"><span className="crmModalLabel">Комментарий менеджера</span><textarea className="crmEditTextarea" value={editingOrder.manager_comment} onChange={(e)=>setEditingOrder((c)=>({...c,manager_comment:e.target.value}))} placeholder="Например: клиент согласовал дополнительную защиту арок" rows={4}/></div>
        {saveMessage&&<div className="crmSaveSuccess"><CheckCircle2 size={17}/>{saveMessage}</div>}
        <div className="crmModalTotal"><span>Стоимость</span><strong>{formatPrice(orderAmount(selectedOrder))}</strong></div>
        <div className="crmModalDate"><Clock3 size={16}/>Создан {formatDate(selectedOrder.created_at)}</div>
        <div className="crmModalActions"><button type="button" className="crmSaveButton" disabled={savingOrder||changingStatus} onClick={saveOrderChanges}>{savingOrder?"Сохраняем...":"Сохранить изменения"}</button><button type="button" className="crmCancelButton" disabled={savingOrder||changingStatus||selectedOrder.status==="cancelled"} onClick={cancelOrder}>{selectedOrder.status==="cancelled"?"Заказ отменён":"Отменить заказ"}</button></div>
      </div></div>}
    </div>
  );
}
