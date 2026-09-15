import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

import {
  Bell,
  ChevronRight,
  ClipboardList,
  Car,
  Headphones,
  SlidersHorizontal,
  Check,
} from "lucide-react";

function formatPrice(price) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

export default function App() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("id");

      if (error) {
        console.error("Ошибка загрузки услуг:", error);
      } else {
        const servicesWithSelection = data.map((service) => ({
          ...service,
          price: Number(service.base_price),

          // Пока оставляем выбранными:
          // Пол, Стены и Виброизоляцию.
          selected: [1, 2, 7].includes(service.id),
        }));

        setServices(servicesWithSelection);
      }

      setLoading(false);
    }

    loadServices();
  }, []);

  const total = services
    .filter((service) => service.selected)
    .reduce((sum, service) => sum + service.price, 0);

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

        <button className="iconButton">
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

              <h1>Ford Transit L3H2</h1>

              <p>
                2023 · Передний привод
              </p>
            </div>

            <div className="vanIcon">
              🚐
            </div>
          </div>

          <button className="linkButton">
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

            <SlidersHorizontal size={22} />
          </div>

          {loading ? (
            <div className="serviceCard">
              Загружаем услуги...
            </div>
          ) : (
            <div className="serviceList">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={
                    service.selected
                      ? "serviceCard selected"
                      : "serviceCard"
                  }
                >
                  <div className="serviceContent">
                    <div>
                      <h3>
                        {service.name}
                      </h3>

                      <strong>
                        от {formatPrice(service.price)}
                      </strong>

                      <p>
                        {service.description}
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
                        <Check size={19} />
                      )}
                    </div>
                  </div>

                  {service.name === "Пол" &&
                    service.selected && (
                      <div className="materials">
                        <span className="material active">
                          Ламинированная фанера
                        </span>

                        <span className="material">
                          Берёзовая фанера
                        </span>

                        <span className="material">
                          Алюминий
                        </span>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
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

        <button className="continueButton">
          Продолжить
          <ChevronRight size={20} />
        </button>
      </div>

      <nav className="bottomNav">
        <button className="navItem activeNav">
          <SlidersHorizontal size={21} />
          <span>
            Конфигуратор
          </span>
        </button>

        <button className="navItem">
          <ClipboardList size={21} />
          <span>
            Заказы
          </span>
        </button>

        <button className="navItem">
          <Car size={21} />
          <span>
            Автомобиль
          </span>
        </button>

        <button className="navItem">
          <Headphones size={21} />
          <span>
            Поддержка
          </span>
        </button>
      </nav>
    </div>
  );
}
