import React, {
  useEffect,
  useState,
} from "react";

import { supabase } from "./supabase.js";

import {
  Bell,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Car,
  Headphones,
  SlidersHorizontal,
  Check,
  MessageSquare,
  CircleCheckBig,
  LoaderCircle,
  Clock3,
  CalendarDays,
} from "lucide-react";

const materialOptions = {
  Пол: [
    "Ламинированная фанера",
    "Берёзовая фанера",
    "Алюминий",
  ],

  Стены: [
    "Ламинированная фанера",
    "Берёзовая фанера",
    "Композит",
  ],
};

const statusInfo = {
  new: {
    label: "Новая заявка",
    icon: "🔵",
  },

  approval: {
    label: "Согласование",
    icon: "🟡",
  },

  production: {
    label: "Производство",
    icon: "🟠",
  },

  installation: {
    label: "Установка",
    icon: "🟣",
  },

  done: {
    label: "Готово",
    icon: "🟢",
  },
};

function formatPrice(price) {
  return (
    new Intl.NumberFormat(
      "ru-RU"
    ).format(Number(price || 0)) +
    " ₽"
  );
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(date));
}

function vehicleName(vehicle) {
  if (!vehicle) {
    return "Автомобиль";
  }

  return [
    vehicle.brand,
    vehicle.model,
    vehicle.configuration,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function App() {
  const [services, setServices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selectedMaterials,
    setSelectedMaterials,
  ] = useState({});

  const [screen, setScreen] =
    useState("configurator");

  const [comment, setComment] =
    useState("");

  const [
    creatingOrder,
    setCreatingOrder,
  ] = useState(false);

  const [
    orderError,
    setOrderError,
  ] = useState("");

  const [
    createdOrder,
    setCreatedOrder,
  ] = useState(null);

  const [orders, setOrders] =
    useState([]);

  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(false);

  const [
    ordersError,
    setOrdersError,
  ] = useState("");

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState(null);

  /*
    ВРЕМЕННЫЙ DEMO-ПОЛЬЗОВАТЕЛЬ.

    Позже заменим это
    Telegram-пользователем.
  */

  const DEMO_CUSTOMER_ID = 1;
  const DEMO_VEHICLE_ID = 1;

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("id");

    if (error) {
      console.error(
        "Ошибка загрузки услуг:",
        error
      );
    } else {
      setServices(
        (data || []).map(
          (service) => ({
            ...service,

            price: Number(
              service.base_price
            ),

            selected: false,
          })
        )
      );
    }

    setLoading(false);
  }

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "get-orders",
          {
            body: {
              customer_id:
                DEMO_CUSTOMER_ID,
            },
          }
        );

      if (error) {
        console.error(
          "Ошибка get-orders:",
          error
        );

        throw new Error(
          "Не удалось загрузить заказы."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Не удалось загрузить заказы."
        );
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);

      setOrdersError(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки заказов."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  function toggleService(serviceId) {
    setServices(
      (currentServices) =>
        currentServices.map(
          (service) => {
            if (
              service.id !==
              serviceId
            ) {
              return service;
            }

            const willBeSelected =
              !service.selected;

            if (
              willBeSelected &&
              materialOptions[
                service.name
              ]
            ) {
              setSelectedMaterials(
                (
                  currentMaterials
                ) => ({
                  ...currentMaterials,

                  [service.id]:
                    currentMaterials[
                      service.id
                    ] ||
                    materialOptions[
                      service.name
                    ][0],
                })
              );
            }

            if (!willBeSelected) {
              setSelectedMaterials(
                (
                  currentMaterials
                ) => {
                  const next = {
                    ...currentMaterials,
                  };

                  delete next[
                    service.id
                  ];

                  return next;
                }
              );
            }

            return {
              ...service,
              selected:
                willBeSelected,
            };
          }
        )
    );
  }

  function selectMaterial(
    serviceId,
    material
  ) {
    setSelectedMaterials(
      (current) => ({
        ...current,
        [serviceId]: material,
      })
    );
  }

  const selectedServices =
    services.filter(
      (service) =>
        service.selected
    );

  const total =
    selectedServices.reduce(
      (sum, service) =>
        sum + service.price,
      0
    );

  function goToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openReview() {
    if (
      selectedServices.length ===
      0
    ) {
      return;
    }

    setOrderError("");
    setScreen("review");
    goToTop();
  }

  function openConfigurator() {
    setSelectedOrder(null);
    setScreen("configurator");
    goToTop();
  }

  async function openOrders() {
    setSelectedOrder(null);
    setScreen("orders");
    goToTop();

    await loadOrders();
  }

  function openOrder(order) {
    setSelectedOrder(order);
    setScreen("order-details");
    goToTop();
  }

  function resetOrder() {
    setServices(
      (currentServices) =>
        currentServices.map(
          (service) => ({
            ...service,
            selected: false,
          })
        )
    );

    setSelectedMaterials({});
    setComment("");
    setCreatedOrder(null);
    setOrderError("");
    setCreatingOrder(false);

    setScreen("configurator");

    goToTop();
  }

  async function submitOrder() {
    if (creatingOrder) {
      return;
    }

    if (
      selectedServices.length ===
      0
    ) {
      setOrderError(
        "Выберите хотя бы одну услугу."
      );

      return;
    }

    setCreatingOrder(true);
    setOrderError("");

    try {
      const orderServices =
        selectedServices.map(
          (service) => ({
            service_id:
              service.id,

            material:
              selectedMaterials[
                service.id
              ] || null,
          })
        );

      const { data, error } =
        await supabase.functions.invoke(
          "create-order",
          {
            body: {
              customer_id:
                DEMO_CUSTOMER_ID,

              vehicle_id:
                DEMO_VEHICLE_ID,

              services:
                orderServices,

              customer_comment:
                comment,
            },
          }
        );

      if (error) {
        console.error(
          "Ошибка create-order:",
          error
        );

        throw new Error(
          "Не удалось отправить заявку."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Не удалось создать заявку."
        );
      }

      setCreatedOrder({
        id: data.order_id,
        total: Number(
          data.total
        ),
      });

      setScreen("success");

      goToTop();
    } catch (error) {
      console.error(error);

      setOrderError(
        error instanceof Error
          ? error.message
          : "Произошла ошибка."
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  function BottomNav({
    active,
  }) {
    return (
      <nav className="bottomNav">
        <button
          className={
            active ===
            "configurator"
              ? "navItem activeNav"
              : "navItem"
          }
          type="button"
          onClick={
            openConfigurator
          }
        >
          <SlidersHorizontal
            size={21}
          />

          <span>
            Конфигуратор
          </span>
        </button>

        <button
          className={
            active === "orders"
              ? "navItem activeNav"
              : "navItem"
          }
          type="button"
          onClick={openOrders}
        >
          <ClipboardList
            size={21}
          />

          <span>
            Заказы
          </span>
        </button>

        <button
          className="navItem"
          type="button"
        >
          <Car size={21} />

          <span>
            Автомобиль
          </span>
        </button>

        <button
          className="navItem"
          type="button"
        >
          <Headphones
            size={21}
          />

          <span>
            Поддержка
          </span>
        </button>
      </nav>
    );
  }

  /*
    ДЕТАЛИ ОДНОГО ЗАКАЗА
  */

  if (
    screen ===
      "order-details" &&
    selectedOrder
  ) {
    const status =
      statusInfo[
        selectedOrder.status
      ] || {
        label:
          selectedOrder.status,
        icon: "⚪",
      };

    return (
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">
              Garage<span>
                Flow
              </span>
            </div>

            <div className="subtitle">
              Заказ №
              {selectedOrder.id}
            </div>
          </div>
        </header>

        <main>
          <button
            type="button"
            className="linkButton"
            onClick={openOrders}
          >
            <ChevronLeft
              size={18}
            />
            Все заказы
          </button>

          <section
            className="vehicleCard"
            style={{
              marginTop: "18px",
            }}
          >
            <div className="vehicleLabel">
              ЗАКАЗ №
              {selectedOrder.id}
            </div>

            <h1
              style={{
                marginTop: "8px",
              }}
            >
              {vehicleName(
                selectedOrder.vehicle
              )}
            </h1>

            <p>
              {formatDate(
                selectedOrder.created_at
              )}
            </p>

            <div
              style={{
                marginTop: "18px",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "#f1f5fa",
                fontWeight: "700",
              }}
            >
              {status.icon}{" "}
              {status.label}
            </div>
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>
                  Работы
                </h2>

                <p>
                  Состав заявки
                </p>
              </div>

              <ClipboardList
                size={22}
              />
            </div>

            <div className="serviceList">
              {selectedOrder.items?.map(
                (item) => (
                  <div
                    className="serviceCard"
                    key={item.id}
                  >
                    <div className="serviceContent">
                      <div>
                        <h3>
                          {
                            item.service_name
                          }
                        </h3>

                        {item.material && (
                          <p>
                            Материал:{" "}
                            {
                              item.material
                            }
                          </p>
                        )}
                      </div>

                      <strong>
                        {formatPrice(
                          item.price
                        )}
                      </strong>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {selectedOrder.customer_comment && (
            <section className="section">
              <div className="sectionHeader">
                <div>
                  <h2>
                    Комментарий
                  </h2>
                </div>

                <MessageSquare
                  size={22}
                />
              </div>

              <div className="serviceCard">
                <p
                  style={{
                    lineHeight: "1.5",
                  }}
                >
                  {
                    selectedOrder.customer_comment
                  }
                </p>
              </div>
            </section>
          )}

          {selectedOrder.scheduled_at && (
            <section className="section">
              <div className="serviceCard">
                <div className="serviceContent">
                  <div>
                    <h3>
                      Запись
                    </h3>

                    <p>
                      {formatDate(
                        selectedOrder.scheduled_at
                      )}
                    </p>
                  </div>

                  <CalendarDays
                    size={25}
                  />
                </div>
              </div>
            </section>
          )}

          <section
            className="section"
            style={{
              marginBottom:
                "25px",
            }}
          >
            <div className="vehicleCard">
              <div
                style={{
                  color: "#7e899a",
                  fontSize: "13px",
                }}
              >
                Стоимость
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  marginTop: "5px",
                }}
              >
                {formatPrice(
                  selectedOrder.final_price ??
                    selectedOrder.preliminary_price
                )}
              </strong>
            </div>
          </section>
        </main>

        <BottomNav active="orders" />
      </div>
    );
  }

  /*
    СПИСОК ЗАКАЗОВ
  */

  if (screen === "orders") {
    return (
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">
              Garage<span>
                Flow
              </span>
            </div>

            <div className="subtitle">
              История заявок
            </div>
          </div>

          <button
            className="iconButton"
            type="button"
          >
            <Bell size={23} />
          </button>
        </header>

        <main>
          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>
                  Мои заказы
                </h2>

                <p>
                  Все ваши заявки
                </p>
              </div>

              <ClipboardList
                size={22}
              />
            </div>

            {ordersLoading && (
              <div
                className="serviceCard"
                style={{
                  textAlign:
                    "center",
                }}
              >
                <LoaderCircle
                  size={25}
                />

                <p
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  Загружаем заказы...
                </p>
              </div>
            )}

            {ordersError && (
              <div
                className="serviceCard"
                style={{
                  color:
                    "#c62828",
                }}
              >
                {ordersError}
              </div>
            )}

            {!ordersLoading &&
              !ordersError &&
              orders.length ===
                0 && (
                <div
                  className="serviceCard"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "30px 20px",
                  }}
                >
                  <ClipboardList
                    size={42}
                    style={{
                      color:
                        "#8793a5",
                    }}
                  />

                  <h3>
                    Заказов пока нет
                  </h3>

                  <p>
                    Создайте первую
                    заявку в
                    конфигураторе.
                  </p>
                </div>
              )}

            <div className="serviceList">
              {orders.map(
                (order) => {
                  const status =
                    statusInfo[
                      order.status
                    ] || {
                      label:
                        order.status,
                      icon: "⚪",
                    };

                  return (
                    <div
                      key={order.id}
                      className="serviceCard"
                      onClick={() =>
                        openOrder(
                          order
                        )
                      }
                      style={{
                        cursor:
                          "pointer",
                      }}
                    >
                      <div className="serviceContent">
                        <div>
                          <div
                            className="vehicleLabel"
                            style={{
                              marginBottom:
                                "5px",
                            }}
                          >
                            ЗАКАЗ №
                            {order.id}
                          </div>

                          <h3>
                            {vehicleName(
                              order.vehicle
                            )}
                          </h3>

                          <strong>
                            {formatPrice(
                              order.final_price ??
                                order.preliminary_price
                            )}
                          </strong>

                          <p>
                            {
                              status.icon
                            }{" "}
                            {
                              status.label
                            }
                          </p>
                        </div>

                        <ChevronRight
                          size={23}
                        />
                      </div>

                      <div
                        style={{
                          marginTop:
                            "14px",
                          paddingTop:
                            "12px",
                          borderTop:
                            "1px solid #edf0f4",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "13px",
                            color:
                              "#66758b",
                            lineHeight:
                              "1.5",
                          }}
                        >
                          {order.items
                            ?.map(
                              (
                                item
                              ) =>
                                item.service_name
                            )
                            .join(
                              " • "
                            )}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "5px",
                            marginTop:
                              "8px",
                            color:
                              "#8a95a6",
                            fontSize:
                              "12px",
                          }}
                        >
                          <Clock3
                            size={14}
                          />

                          {formatDate(
                            order.created_at
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </main>

        <BottomNav active="orders" />
      </div>
    );
  }

  /*
    УСПЕШНОЕ СОЗДАНИЕ
  */

  if (
    screen === "success" &&
    createdOrder
  ) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">
              Garage<span>
                Flow
              </span>
            </div>

            <div className="subtitle">
              Заявка отправлена
            </div>
          </div>
        </header>

        <main>
          <section
            className="vehicleCard"
            style={{
              marginTop: "25px",
              textAlign: "center",
              padding: "35px 22px",
            }}
          >
            <CircleCheckBig
              size={70}
              strokeWidth={1.7}
              style={{
                color: "#1672f3",
                marginBottom:
                  "15px",
              }}
            />

            <div
              className="vehicleLabel"
              style={{
                marginBottom:
                  "8px",
              }}
            >
              ЗАЯВКА СОЗДАНА
            </div>

            <h1
              style={{
                fontSize: "30px",
              }}
            >
              Заказ №
              {createdOrder.id}
            </h1>

            <p>
              Мы получили вашу
              заявку. Менеджер
              сможет увидеть её в
              GarageFlow CRM.
            </p>

            <div
              style={{
                marginTop: "25px",
                padding: "18px",
                borderRadius:
                  "16px",
                background:
                  "#f4f7fb",
              }}
            >
              <div
                style={{
                  color:
                    "#7e899a",
                  fontSize:
                    "13px",
                }}
              >
                Предварительная
                стоимость
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "4px",
                  fontSize:
                    "30px",
                }}
              >
                {formatPrice(
                  createdOrder.total
                )}
              </strong>
            </div>

            <button
              type="button"
              className="continueButton"
              onClick={openOrders}
              style={{
                width: "100%",
                justifyContent:
                  "center",
                marginTop:
                  "25px",
              }}
            >
              Мои заказы
              <ChevronRight
                size={20}
              />
            </button>

            <button
              type="button"
              className="linkButton"
              onClick={resetOrder}
              style={{
                width: "100%",
                justifyContent:
                  "center",
                marginTop:
                  "18px",
              }}
            >
              Новый заказ
            </button>
          </section>
        </main>

        <BottomNav active="orders" />
      </div>
    );
  }

  /*
    ПРОВЕРКА ЗАКАЗА
  */

  if (screen === "review") {
    return (
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">
              Garage<span>
                Flow
              </span>
            </div>

            <div className="subtitle">
              Подтверждение заявки
            </div>
          </div>
        </header>

        <main>
          <button
            className="linkButton"
            type="button"
            onClick={
              openConfigurator
            }
          >
            <ChevronLeft
              size={18}
            />
            Вернуться
          </button>

          <section
            className="vehicleCard"
            style={{
              marginTop: "18px",
            }}
          >
            <div className="vehicleLabel">
              ВАШ АВТОМОБИЛЬ
            </div>

            <h1>
              Ford Transit L3H2
            </h1>

            <p>
              2023 · Передний
              привод
            </p>
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>
                  Ваш заказ
                </h2>

                <p>
                  Проверьте работы
                </p>
              </div>

              <ClipboardList
                size={22}
              />
            </div>

            <div className="serviceList">
              {selectedServices.map(
                (service) => (
                  <div
                    key={service.id}
                    className="serviceCard"
                  >
                    <div className="serviceContent">
                      <div>
                        <h3>
                          {
                            service.name
                          }
                        </h3>

                        {selectedMaterials[
                          service.id
                        ] && (
                          <p>
                            Материал:{" "}
                            {
                              selectedMaterials[
                                service.id
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <strong>
                        {formatPrice(
                          service.price
                        )}
                      </strong>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>
                  Комментарий
                </h2>

                <p>
                  Необязательно
                </p>
              </div>

              <MessageSquare
                size={22}
              />
            </div>

            <div className="serviceCard">
              <textarea
                value={comment}
                onChange={(
                  event
                ) =>
                  setComment(
                    event.target
                      .value
                  )
                }
                placeholder="Комментарий к заявке..."
                rows={5}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize:
                    "vertical",
                  font: "inherit",
                  background:
                    "transparent",
                }}
              />
            </div>
          </section>

          {orderError && (
            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "14px",
                background:
                  "#fff1f1",
                color:
                  "#c62828",
                borderRadius:
                  "14px",
              }}
            >
              {orderError}
            </div>
          )}
        </main>

        <div className="totalBar">
          <div>
            <span>
              Предварительно
            </span>

            <strong>
              {formatPrice(total)}
            </strong>
          </div>

          <button
            className="continueButton"
            type="button"
            onClick={submitOrder}
            disabled={
              creatingOrder
            }
          >
            {creatingOrder ? (
              <>
                <LoaderCircle
                  size={20}
                />
                Отправляем...
              </>
            ) : (
              <>
                Оформить
                <ChevronRight
                  size={20}
                />
              </>
            )}
          </button>
        </div>

        <BottomNav active="configurator" />
      </div>
    );
  }

  /*
    КОНФИГУРАТОР
  */

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="logo">
            Garage<span>
              Flow
            </span>
          </div>

          <div className="subtitle">
            Коммерческий транспорт
          </div>
        </div>

        <button
          className="iconButton"
          type="button"
        >
          <Bell size={23} />

          <span className="notificationDot" />
        </button>
      </header>

      <main>
        <section className="vehicleCard">
          <div className="vehicleTop">
            <div>
              <div className="vehicleLabel">
                МОЙ АВТОМОБИЛЬ
              </div>

              <h1>
                Ford Transit L3H2
              </h1>

              <p>
                2023 · Передний
                привод
              </p>
            </div>

            <div className="vanIcon">
              🚐
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>
                Выберите
                дооборудование
              </h2>

              <p>
                Можно выбрать
                несколько вариантов
              </p>
            </div>

            <SlidersHorizontal
              size={22}
            />
          </div>

          {loading ? (
            <div className="serviceCard">
              Загружаем услуги...
            </div>
          ) : (
            <div className="serviceList">
              {services.map(
                (service) => {
                  const materials =
                    materialOptions[
                      service.name
                    ];

                  const selectedMaterial =
                    selectedMaterials[
                      service.id
                    ];

                  return (
                    <div
                      key={service.id}
                      className={
                        service.selected
                          ? "serviceCard selected"
                          : "serviceCard"
                      }
                      onClick={() =>
                        toggleService(
                          service.id
                        )
                      }
                      style={{
                        cursor:
                          "pointer",
                      }}
                    >
                      <div className="serviceContent">
                        <div>
                          <h3>
                            {
                              service.name
                            }
                          </h3>

                          <strong>
                            от{" "}
                            {formatPrice(
                              service.price
                            )}
                          </strong>

                          <p>
                            {
                              service.description
                            }
                          </p>
                        </div>

                        <div
                          className={
                            service.selected
                              ? "check selectedCheck"
                              : "check"
                          }
                        >
                          {service.selected && (
                            <Check
                              size={19}
                            />
                          )}
                        </div>
                      </div>

                      {service.selected &&
                        materials && (
                          <div
                            className="materials"
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            {materials.map(
                              (
                                material
                              ) => (
                                <button
                                  key={
                                    material
                                  }
                                  type="button"
                                  className={
                                    selectedMaterial ===
                                    material
                                      ? "material active"
                                      : "material"
                                  }
                                  onClick={() =>
                                    selectMaterial(
                                      service.id,
                                      material
                                    )
                                  }
                                  style={{
                                    border:
                                      "none",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  {
                                    material
                                  }
                                </button>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      <div className="totalBar">
        <div>
          <span>
            {selectedServices.length
              ? `Выбрано: ${selectedServices.length}`
              : "Предварительно"}
          </span>

          <strong>
            {formatPrice(total)}
          </strong>
        </div>

        <button
          className="continueButton"
          type="button"
          onClick={openReview}
          disabled={
            selectedServices.length ===
            0
          }
          style={{
            opacity:
              selectedServices.length ===
              0
                ? 0.5
                : 1,
          }}
        >
          Продолжить
          <ChevronRight
            size={20}
          />
        </button>
      </div>

      <BottomNav active="configurator" />
    </div>
  );
}



