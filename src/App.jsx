import React, { useEffect, useState } from "react";
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

function formatPrice(price) {
  return (
    new Intl.NumberFormat("ru-RU").format(price) + " ₽"
  );
}

export default function App() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMaterials, setSelectedMaterials] =
    useState({});

  const [screen, setScreen] =
    useState("configurator");

  const [comment, setComment] = useState("");

  const [creatingOrder, setCreatingOrder] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const [createdOrder, setCreatedOrder] =
    useState(null);

  /*
    Пока это DEMO-пользователь.

    Позже customer_id и vehicle_id
    будут определяться автоматически
    через Telegram.
  */

  const DEMO_CUSTOMER_ID = 1;
  const DEMO_VEHICLE_ID = 1;

  useEffect(() => {
    async function loadServices() {
      setLoading(true);

      const { data, error } = await supabase
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
        const servicesWithSelection =
          (data || []).map((service) => ({
            ...service,
            price: Number(service.base_price),
            selected: false,
          }));

        setServices(servicesWithSelection);
      }

      setLoading(false);
    }

    loadServices();
  }, []);

  function toggleService(serviceId) {
    setServices((currentServices) =>
      currentServices.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }

        const willBeSelected =
          !service.selected;

        if (
          willBeSelected &&
          materialOptions[service.name]
        ) {
          setSelectedMaterials(
            (currentMaterials) => ({
              ...currentMaterials,

              [service.id]:
                currentMaterials[service.id] ||
                materialOptions[service.name][0],
            })
          );
        }

        if (!willBeSelected) {
          setSelectedMaterials(
            (currentMaterials) => {
              const newMaterials = {
                ...currentMaterials,
              };

              delete newMaterials[service.id];

              return newMaterials;
            }
          );
        }

        return {
          ...service,
          selected: willBeSelected,
        };
      })
    );
  }

  function selectMaterial(
    serviceId,
    material
  ) {
    setSelectedMaterials(
      (currentMaterials) => ({
        ...currentMaterials,
        [serviceId]: material,
      })
    );
  }

  const selectedServices =
    services.filter(
      (service) => service.selected
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
      selectedServices.length === 0
    ) {
      return;
    }

    setOrderError("");
    setScreen("review");
    goToTop();
  }

  function backToConfigurator() {
    setOrderError("");
    setScreen("configurator");
    goToTop();
  }

  function resetOrder() {
    setServices((currentServices) =>
      currentServices.map((service) => ({
        ...service,
        selected: false,
      }))
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
      selectedServices.length === 0
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
            service_id: service.id,

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
          "Ошибка Edge Function:",
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
        total: Number(data.total),
      });

      setScreen("success");

      goToTop();
    } catch (error) {
      console.error(
        "Ошибка создания заказа:",
        error
      );

      setOrderError(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при создании заявки."
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  /*
    ЭКРАН УСПЕШНОГО
    СОЗДАНИЯ ЗАКАЗА
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
              Garage<span>Flow</span>
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
                marginBottom: "15px",
              }}
            />

            <div
              className="vehicleLabel"
              style={{
                marginBottom: "8px",
              }}
            >
              ЗАЯВКА СОЗДАНА
            </div>

            <h1
              style={{
                fontSize: "30px",
                marginBottom: "8px",
              }}
            >
              Заказ №{createdOrder.id}
            </h1>

            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.5",
              }}
            >
              Мы получили вашу заявку.
              Менеджер сможет увидеть её
              в GarageFlow CRM.
            </p>

            <div
              style={{
                marginTop: "25px",
                padding: "18px",
                borderRadius: "16px",
                background: "#f4f7fb",
              }}
            >
              <div
                style={{
                  color: "#7e899a",
                  fontSize: "13px",
                }}
              >
                Предварительная стоимость
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "30px",
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
              onClick={resetOrder}
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: "25px",
              }}
            >
              Новый заказ
              <ChevronRight size={20} />
            </button>
          </section>

          <section className="section">
            <div className="serviceCard">
              <div className="serviceContent">
                <div>
                  <h3>
                    Ford Transit L3H2
                  </h3>

                  <p>
                    Автомобиль заявки
                  </p>
                </div>

                <Car size={27} />
              </div>
            </div>
          </section>
        </main>

        <nav className="bottomNav">
          <button
            className="navItem"
            type="button"
            onClick={resetOrder}
          >
            <SlidersHorizontal
              size={21}
            />
            <span>
              Конфигуратор
            </span>
          </button>

          <button
            className="navItem activeNav"
            type="button"
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
            <Headphones size={21} />
            <span>
              Поддержка
            </span>
          </button>
        </nav>
      </div>
    );
  }

  /*
    ЭКРАН ПРОВЕРКИ ЗАКАЗА
  */

  if (screen === "review") {
    return (
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">
              Garage<span>Flow</span>
            </div>

            <div className="subtitle">
              Подтверждение заявки
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
          <button
            type="button"
            className="linkButton"
            onClick={
              backToConfigurator
            }
            style={{
              marginTop: "4px",
              marginBottom: "18px",
            }}
          >
            <ChevronLeft size={18} />
            Вернуться к конфигуратору
          </button>

          <section className="vehicleCard">
            <div className="vehicleTop">
              <div>
                <div className="vehicleLabel">
                  ВАШ АВТОМОБИЛЬ
                </div>

                <h1>
                  Ford Transit L3H2
                </h1>

                <p>
                  2023 · Передний привод
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
                  Ваш заказ
                </h2>

                <p>
                  Проверьте выбранные работы
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
                          {service.name}
                        </h3>

                        {selectedMaterials[
                          service.id
                        ] && (
                          <p
                            style={{
                              marginBottom:
                                "7px",
                            }}
                          >
                            Материал:{" "}
                            <strong
                              style={{
                                display:
                                  "inline",
                              }}
                            >
                              {
                                selectedMaterials[
                                  service.id
                                ]
                              }
                            </strong>
                          </p>
                        )}

                        <p>
                          {
                            service.description
                          }
                        </p>
                      </div>

                      <strong
                        style={{
                          whiteSpace:
                            "nowrap",
                          fontSize:
                            "16px",
                        }}
                      >
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
                onChange={(event) =>
                  setComment(
                    event.target.value
                  )
                }
                placeholder="Например: нужна дополнительная защита пола, позвоните после 18:00..."
                rows={5}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  font: "inherit",
                  fontSize: "15px",
                  color: "#0f1d36",
                  background:
                    "transparent",
                  lineHeight: "1.5",
                }}
              />
            </div>
          </section>

          {orderError && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px 16px",
                borderRadius: "14px",
                background: "#fff1f1",
                color: "#c62828",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            >
              {orderError}
            </div>
          )}

          <section
            className="section"
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              className="vehicleCard"
              style={{
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#7e899a",
                      fontSize: "13px",
                    }}
                  >
                    Выбрано работ
                  </div>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                      marginTop: "3px",
                    }}
                  >
                    {
                      selectedServices.length
                    }
                  </strong>
                </div>

                <div
                  style={{
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      color: "#7e899a",
                      fontSize: "13px",
                    }}
                  >
                    Предварительная стоимость
                  </div>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "25px",
                      marginTop: "3px",
                    }}
                  >
                    {formatPrice(total)}
                  </strong>
                </div>
              </div>
            </div>
          </section>
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
            disabled={creatingOrder}
            style={{
              opacity:
                creatingOrder
                  ? 0.7
                  : 1,

              cursor:
                creatingOrder
                  ? "default"
                  : "pointer",
            }}
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
                Оформить заявку
                <ChevronRight
                  size={20}
                />
              </>
            )}
          </button>
        </div>

        <nav className="bottomNav">
          <button
            className="navItem activeNav"
            type="button"
            onClick={
              backToConfigurator
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
            className="navItem"
            type="button"
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
      </div>
    );
  }

  /*
    ГЛАВНЫЙ ЭКРАН —
    КОНФИГУРАТОР
  */

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="logo">
            Garage<span>Flow</span>
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
                2023 · Передний привод
              </p>
            </div>

            <div className="vanIcon">
              🚐
            </div>
          </div>

          <button
            className="linkButton"
            type="button"
          >
            Изменить автомобиль
            <ChevronRight size={18} />
          </button>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>
                Выберите дооборудование
              </h2>

              <p>
                Можно выбрать несколько вариантов
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
                            {service.name}
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
            {selectedServices.length >
            0
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

            cursor:
              selectedServices.length ===
              0
                ? "default"
                : "pointer",
          }}
        >
          Продолжить
          <ChevronRight size={20} />
        </button>
      </div>

      <nav className="bottomNav">
        <button
          className="navItem activeNav"
          type="button"
        >
          <SlidersHorizontal
            size={21}
          />
          <span>
            Конфигуратор
          </span>
        </button>

        <button
          className="navItem"
          type="button"
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
          <Headphones size={21} />
          <span>
            Поддержка
          </span>
        </button>
      </nav>
    </div>
  );
}



