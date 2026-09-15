import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase.js";

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  CalendarDays,
  Package,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
  Search,
  ChevronRight,
  X,
  CheckCircle2,
  Clock3,
  UserRound,
} from "lucide-react";


const columns = [
  {
    key: "new",
    label: "Новая заявка",
  },
  {
    key: "approval",
    label: "Согласование",
  },
  {
    key: "production",
    label: "Производство",
  },
  {
    key: "installation",
    label: "Установка",
  },
  {
    key: "done",
    label: "Готово",
  },
];


const statusLabels = {
  new: "Новая заявка",
  approval: "Согласование",
  production: "Производство",
  installation: "Установка",
  done: "Готово",
  cancelled: "Отменён",
};


function formatPrice(value) {
  return (
    new Intl.NumberFormat(
      "ru-RU"
    ).format(Number(value || 0)) +
    " ₽"
  );
}


function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}


function getCustomerName(customer) {
  if (!customer) {
    return "Клиент";
  }

  const name = [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    name ||
    customer.username ||
    "Клиент"
  );
}


function getVehicleName(vehicle) {
  if (!vehicle) {
    return "Автомобиль не указан";
  }

  return [
    vehicle.brand,
    vehicle.model,
    vehicle.configuration,
  ]
    .filter(Boolean)
    .join(" ");
}


function getDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


export default function CrmApp() {
  const [session, setSession] =
    useState(null);

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  const [
    loginError,
    setLoginError,
  ] = useState("");

  const [employee, setEmployee] =
    useState(null);

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState(null);

  const [
    changingStatus,
    setChangingStatus,
  ] = useState(false);

  const [
    editingOrder,
    setEditingOrder,
  ] = useState({
    final_price: "",
    manager_comment: "",
    scheduled_at: "",
  });

  const [
    savingOrder,
    setSavingOrder,
  ] = useState(false);

  const [
    saveMessage,
    setSaveMessage,
  ] = useState("");


  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(session);
      setCheckingAuth(false);

      if (session) {
        await loadOrders();
      }
    }

    initialize();

    const {
      data: subscription,
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(
            nextSession
          );
        }
      );

    return () => {
      mounted = false;

      subscription.subscription.unsubscribe();
    };
  }, []);


  async function getAccessToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.access_token ||
      null
    );
  }


  async function invokeCrmFunction(
    functionName,
    body = {}
  ) {
    const token =
      await getAccessToken();

    if (!token) {
      throw new Error(
        "Сессия закончилась. Войдите снова."
      );
    }

    const { data, error } =
      await supabase.functions.invoke(
        functionName,
        {
          body,
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    if (error) {
      console.error(
        functionName,
        error
      );

      throw new Error(
        "Ошибка соединения с CRM."
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          "Ошибка CRM."
      );
    }

    return data;
  }


  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const data =
        await invokeCrmFunction(
          "crm-orders"
        );

      setEmployee(
        data.employee
      );

      setOrders(
        data.orders || []
      );

      if (selectedOrder) {
        const refreshed =
          (data.orders || []).find(
            (order) =>
              order.id ===
              selectedOrder.id
          );

        if (refreshed) {
          setSelectedOrder(
            refreshed
          );

          setEditingOrder({
            final_price:
              refreshed.final_price ??
              "",

            manager_comment:
              refreshed.manager_comment ??
              "",

            scheduled_at:
              getDateTimeLocalValue(
                refreshed.scheduled_at
              ),
          });
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ошибка загрузки CRM."
      );
    } finally {
      setLoading(false);
    }
  }


  async function login(event) {
    event.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

      if (error) {
        throw error;
      }

      setSession(
        data.session
      );

      await loadOrders();
    } catch (err) {
      console.error(err);

      setLoginError(
        "Неверный email или пароль."
      );
    } finally {
      setLoginLoading(false);
    }
  }


  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setEmployee(null);
    setOrders([]);
    setSelectedOrder(null);
  }


  function openOrder(order) {
    setEditingOrder({
      final_price:
        order.final_price ?? "",

      manager_comment:
        order.manager_comment ?? "",

      scheduled_at:
        getDateTimeLocalValue(
          order.scheduled_at
        ),
    });

    setSaveMessage("");
    setError("");
    setSelectedOrder(order);
  }


  async function changeStatus(
    order,
    status
  ) {
    if (
      changingStatus ||
      order.status === status
    ) {
      return;
    }

    setChangingStatus(true);
    setError("");
    setSaveMessage("");

    try {
      await invokeCrmFunction(
        "crm-update-status",
        {
          order_id: order.id,
          status,
        }
      );

      const updatedOrders =
        orders.map(
          (current) =>
            current.id ===
            order.id
              ? {
                  ...current,
                  status,
                }
              : current
        );

      setOrders(
        updatedOrders
      );

      if (
        selectedOrder?.id ===
        order.id
      ) {
        setSelectedOrder(
          (current) => ({
            ...current,
            status,
          })
        );
      }

      setSaveMessage(
        "Статус изменён"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось изменить статус."
      );
    } finally {
      setChangingStatus(false);
    }
  }


  async function saveOrderChanges() {
    if (
      !selectedOrder ||
      savingOrder
    ) {
      return;
    }

    setSavingOrder(true);
    setSaveMessage("");
    setError("");

    try {
      let scheduledAt = null;

      if (
        editingOrder.scheduled_at
      ) {
        const date =
          new Date(
            editingOrder.scheduled_at
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          throw new Error(
            "Проверьте дату и время записи."
          );
        }

        scheduledAt =
          date.toISOString();
      }

      const data =
        await invokeCrmFunction(
          "crm-update-order",
          {
            order_id:
              selectedOrder.id,

            final_price:
              editingOrder.final_price ===
              ""
                ? null
                : Number(
                    editingOrder.final_price
                  ),

            manager_comment:
              editingOrder.manager_comment,

            scheduled_at:
              scheduledAt,
          }
        );

      const updated = {
        ...selectedOrder,
        ...data.order,
      };

      setSelectedOrder(
        updated
      );

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              order.id ===
              updated.id
                ? {
                    ...order,
                    ...data.order,
                  }
                : order
          )
      );

      setEditingOrder({
        final_price:
          updated.final_price ?? "",

        manager_comment:
          updated.manager_comment ?? "",

        scheduled_at:
          getDateTimeLocalValue(
            updated.scheduled_at
          ),
      });

      setSaveMessage(
        "Изменения сохранены"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить заказ."
      );
    } finally {
      setSavingOrder(false);
    }
  }


  async function cancelOrder() {
    if (
      !selectedOrder ||
      savingOrder
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Отменить заказ №${selectedOrder.id}?`
      );

    if (!confirmed) {
      return;
    }

    setSavingOrder(true);
    setError("");
    setSaveMessage("");

    try {
      const data =
        await invokeCrmFunction(
          "crm-update-order",
          {
            order_id:
              selectedOrder.id,

            status:
              "cancelled",
          }
        );

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              order.id ===
              selectedOrder.id
                ? {
                    ...order,
                    ...data.order,
                  }
                : order
          )
      );

      setSelectedOrder(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось отменить заказ."
      );
    } finally {
      setSavingOrder(false);
    }
  }


  const filteredOrders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return orders;
      }

      return orders.filter(
        (order) => {
          const text = [
            order.id,

            getCustomerName(
              order.customer
            ),

            order.customer
              ?.phone,

            getVehicleName(
              order.vehicle
            ),

            order.vehicle
              ?.license_plate,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [orders, search]);


  const totalRevenue =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.final_price ??
            order.preliminary_price ??
            0
        ),
      0
    );


  const activeOrders =
    orders.filter(
      (order) =>
        ![
          "done",
          "cancelled",
        ].includes(order.status)
    ).length;


  if (checkingAuth) {
    return (
      <div className="crmLoginPage">
        <div className="crmLoginCard">
          <div className="crmBrand">
            Garage<span>
              Flow
            </span>
          </div>

          <p>
            Проверяем сессию...
          </p>
        </div>
      </div>
    );
  }


  if (!session) {
    return (
      <div className="crmLoginPage">
        <form
          className="crmLoginCard"
          onSubmit={login}
        >
          <div className="crmBrand">
            Garage<span>
              Flow
            </span>
          </div>

          <div className="crmLoginSubtitle">
            CRM для сотрудников
          </div>

          <h1>
            Вход в систему
          </h1>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="manager@company.ru"
              required
            />
          </label>

          <label>
            Пароль

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="••••••••"
              required
            />
          </label>

          {loginError && (
            <div className="crmError">
              {loginError}
            </div>
          )}

          <button
            className="crmPrimaryButton"
            type="submit"
            disabled={
              loginLoading
            }
          >
            {loginLoading
              ? "Входим..."
              : "Войти"}
          </button>
        </form>
      </div>
    );
  }


  return (
    <div className="crm">

      <aside className="crmSidebar">

        <div className="crmBrand crmSidebarBrand">
          Garage<span>
            Flow
          </span>
        </div>

        <div className="crmSidebarSubtitle">
          SERVICE CRM
        </div>


        <nav className="crmMenu">

          <button className="crmMenuItem">
            <LayoutDashboard
              size={19}
            />
            Обзор
          </button>

          <button className="crmMenuItem crmMenuItemActive">
            <ClipboardList
              size={19}
            />
            Заказы
          </button>

          <button className="crmMenuItem">
            <Users size={19} />
            Клиенты
          </button>

          <button className="crmMenuItem">
            <Car size={19} />
            Автомобили
          </button>

          <button className="crmMenuItem">
            <CalendarDays
              size={19}
            />
            Календарь
          </button>

          <button className="crmMenuItem">
            <Package size={19} />
            Склад
          </button>

          <button className="crmMenuItem">
            <BarChart3
              size={19}
            />
            Аналитика
          </button>

          <button className="crmMenuItem">
            <Settings
              size={19}
            />
            Настройки
          </button>

        </nav>


        <div className="crmSidebarBottom">

          <div className="crmEmployee">

            <div className="crmAvatar">
              <UserRound
                size={19}
              />
            </div>

            <div>
              <strong>
                {employee
                  ?.display_name ||
                  "Сотрудник"}
              </strong>

              <span>
                {employee?.role}
              </span>
            </div>

          </div>


          <button
            className="crmLogout"
            type="button"
            onClick={logout}
          >
            <LogOut size={18} />
            Выйти
          </button>

        </div>

      </aside>


      <main className="crmMain">

        <header className="crmTopbar">

          <div>
            <h1>
              Заказы
            </h1>

            <p>
              Управление заявками GarageFlow
            </p>
          </div>


          <button
            type="button"
            className="crmRefresh"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw
              size={18}
            />
            Обновить
          </button>

        </header>


        <section className="crmStats">

          <div className="crmStat">
            <span>
              Всего заказов
            </span>

            <strong>
              {orders.length}
            </strong>
          </div>


          <div className="crmStat">
            <span>
              В работе
            </span>

            <strong>
              {activeOrders}
            </strong>
          </div>


          <div className="crmStat">
            <span>
              Завершено
            </span>

            <strong>
              {
                orders.filter(
                  (order) =>
                    order.status ===
                    "done"
                ).length
              }
            </strong>
          </div>


          <div className="crmStat">
            <span>
              Сумма заказов
            </span>

            <strong>
              {formatPrice(
                totalRevenue
              )}
            </strong>
          </div>

        </section>


        <section className="crmToolbar">

          <div className="crmSearch">

            <Search size={18} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Поиск по клиенту, автомобилю, номеру..."
            />

          </div>

        </section>


        {error && (
          <div className="crmError crmPageError">
            {error}
          </div>
        )}


        {loading ? (
          <div className="crmLoading">
            Загружаем заказы...
          </div>
        ) : (
          <section className="crmBoard">

            {columns.map(
              (column) => {

                const columnOrders =
                  filteredOrders.filter(
                    (order) =>
                      order.status ===
                      column.key
                  );

                return (
                  <div
                    className="crmColumn"
                    key={
                      column.key
                    }
                  >

                    <div className="crmColumnHeader">

                      <span>
                        {
                          column.label
                        }
                      </span>

                      <strong>
                        {
                          columnOrders.length
                        }
                      </strong>

                    </div>


                    <div className="crmColumnCards">

                      {columnOrders.map(
                        (order) => (

                          <article
                            key={
                              order.id
                            }
                            className="crmOrderCard"
                            onClick={() =>
                              openOrder(
                                order
                              )
                            }
                          >

                            <div className="crmOrderTop">

                              <span>
                                Заказ №
                                {
                                  order.id
                                }
                              </span>

                              <ChevronRight
                                size={17}
                              />

                            </div>


                            <h3>
                              {getVehicleName(
                                order.vehicle
                              )}
                            </h3>


                            <p className="crmCustomerName">
                              {getCustomerName(
                                order.customer
                              )}
                            </p>


                            <div className="crmServices">
                              {order.items
                                ?.map(
                                  (item) =>
                                    item.service_name
                                )
                                .join(
                                  " • "
                                )}
                            </div>


                            {order.scheduled_at && (
                              <div className="crmOrderSchedule">
                                <Clock3
                                  size={14}
                                />
                                {formatDate(
                                  order.scheduled_at
                                )}
                              </div>
                            )}


                            <div className="crmOrderBottom">

                              <strong>
                                {formatPrice(
                                  order.final_price ??
                                    order.preliminary_price
                                )}
                              </strong>

                              <span>
                                {formatDate(
                                  order.created_at
                                )}
                              </span>

                            </div>

                          </article>
                        )
                      )}


                      {columnOrders.length ===
                        0 && (
                        <div className="crmEmptyColumn">
                          Нет заказов
                        </div>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </section>
        )}

      </main>


      {selectedOrder && (

        <div
          className="crmModalBackdrop"
          onClick={() =>
            setSelectedOrder(
              null
            )
          }
        >

          <div
            className="crmModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="crmModalClose"
              type="button"
              onClick={() =>
                setSelectedOrder(
                  null
                )
              }
            >
              <X size={21} />
            </button>


            <div className="crmOrderNumber">
              ЗАКАЗ №
              {selectedOrder.id}
            </div>


            <h2>
              {getVehicleName(
                selectedOrder.vehicle
              )}
            </h2>


            <p className="crmModalCustomer">

              {getCustomerName(
                selectedOrder.customer
              )}

              {selectedOrder
                .customer?.phone &&
                ` · ${selectedOrder.customer.phone}`}

            </p>


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Текущий статус
              </span>

              <strong>
                {
                  statusLabels[
                    selectedOrder.status
                  ] ||
                  selectedOrder.status
                }
              </strong>

            </div>


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Изменить статус
              </span>

              <div className="crmStatusButtons">

                {columns.map(
                  (column) => (

                    <button
                      key={
                        column.key
                      }
                      type="button"
                      disabled={
                        changingStatus ||
                        savingOrder
                      }
                      className={
                        selectedOrder.status ===
                        column.key
                          ? "crmStatusButton crmStatusButtonActive"
                          : "crmStatusButton"
                      }
                      onClick={() =>
                        changeStatus(
                          selectedOrder,
                          column.key
                        )
                      }
                    >

                      {selectedOrder.status ===
                        column.key && (
                        <CheckCircle2
                          size={15}
                        />
                      )}

                      {
                        column.label
                      }

                    </button>

                  )
                )}

              </div>

            </div>


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Работы
              </span>

              <div className="crmModalItems">

                {selectedOrder.items?.map(
                  (item) => (

                    <div
                      key={
                        item.id
                      }
                      className="crmModalItem"
                    >

                      <div>

                        <strong>
                          {
                            item.service_name
                          }
                        </strong>

                        {item.material && (
                          <span>
                            {
                              item.material
                            }
                          </span>
                        )}

                      </div>

                      <strong>
                        {formatPrice(
                          item.price
                        )}
                      </strong>

                    </div>

                  )
                )}

              </div>

            </div>


            {selectedOrder
              .customer_comment && (

              <div className="crmModalSection">

                <span className="crmModalLabel">
                  Комментарий клиента
                </span>

                <p>
                  {
                    selectedOrder
                      .customer_comment
                  }
                </p>

              </div>
            )}


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Дата и время записи
              </span>

              <input
                className="crmEditInput"
                type="datetime-local"
                value={
                  editingOrder.scheduled_at
                }
                onChange={(event) =>
                  setEditingOrder(
                    (current) => ({
                      ...current,
                      scheduled_at:
                        event.target.value,
                    })
                  )
                }
              />

            </div>


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Итоговая стоимость
              </span>

              <div className="crmPriceInputWrap">

                <input
                  className="crmEditInput"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    editingOrder.final_price
                  }
                  onChange={(event) =>
                    setEditingOrder(
                      (current) => ({
                        ...current,
                        final_price:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Например, 52000"
                />

                <span>
                  ₽
                </span>

              </div>

            </div>


            <div className="crmModalSection">

              <span className="crmModalLabel">
                Комментарий менеджера
              </span>

              <textarea
                className="crmEditTextarea"
                value={
                  editingOrder.manager_comment
                }
                onChange={(event) =>
                  setEditingOrder(
                    (current) => ({
                      ...current,
                      manager_comment:
                        event.target.value,
                    })
                  )
                }
                placeholder="Например: клиент согласовал дополнительную защиту арок"
                rows={4}
              />

            </div>


            {saveMessage && (

              <div className="crmSaveSuccess">

                <CheckCircle2
                  size={17}
                />

                {saveMessage}

              </div>
            )}


            <div className="crmModalTotal">

              <span>
                Стоимость
              </span>

              <strong>
                {formatPrice(
                  selectedOrder.final_price ??
                    selectedOrder.preliminary_price
                )}
              </strong>

            </div>


            <div className="crmModalDate">

              <Clock3 size={16} />

              Создан{" "}
              {formatDate(
                selectedOrder.created_at
              )}

            </div>


            <div className="crmModalActions">

              <button
                type="button"
                className="crmSaveButton"
                disabled={
                  savingOrder ||
                  changingStatus
                }
                onClick={
                  saveOrderChanges
                }
              >
                {savingOrder
                  ? "Сохраняем..."
                  : "Сохранить изменения"}
              </button>


              <button
                type="button"
                className="crmCancelButton"
                disabled={
                  savingOrder ||
                  changingStatus ||
                  selectedOrder.status ===
                    "cancelled"
                }
                onClick={
                  cancelOrder
                }
              >
                {selectedOrder.status ===
                "cancelled"
                  ? "Заказ отменён"
                  : "Отменить заказ"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


