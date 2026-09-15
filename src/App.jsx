import {
  Bell,
  ChevronRight,
  ClipboardList,
  Car,
  Headphones,
  SlidersHorizontal,
  Check,
} from "lucide-react";

const services = [
  {
    id: 1,
    name: "Пол",
    description: "Надёжная защита грузового отсека",
    price: 15000,
    selected: true,
  },
  {
    id: 2,
    name: "Стены",
    description: "Защита кузова от повреждений",
    price: 18000,
    selected: true,
  },
  {
    id: 3,
    name: "Колёсные арки",
    description: "Защита уязвимых зон",
    price: 6000,
    selected: false,
  },
  {
    id: 4,
    name: "Виброизоляция",
    description: "Тише и комфортнее в дороге",
    price: 15000,
    selected: true,
  },
  {
    id: 5,
    name: "Утепление",
    description: "Комфорт в любую погоду",
    price: 18000,
    selected: false,
  },
];

function formatPrice(price) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

export default function App() {
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
          <div className="subtitle">Коммерческий транспорт</div>
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
              <div className="vehicleLabel">МОЙ АВТОМОБИЛЬ</div>
              <h1>Ford Transit L3H2</h1>
              <p>2023 · Передний привод</p>
            </div>

            <div className="vanIcon">🚐</div>
          </div>

          <button className="linkButton">
            Изменить автомобиль
            <ChevronRight size={18} />
          </button>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h2>Выберите дооборудование</h2>
              <p>Можно выбрать несколько вариантов</p>
            </div>

            <SlidersHorizontal size={22} />
          </div>

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
                    <h3>{service.name}</h3>
                    <strong>от {formatPrice(service.price)}</strong>
                    <p>{service.description}</p>
                  </div>

                  <div
                    className={
                      service.selected
                        ? "check selectedCheck"
                        : "check"
                    }
                  >
                    {service.selected && <Check size={19} />}
                  </div>
                </div>

                {service.name === "Пол" && service.selected && (
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
        </section>
      </main>

      <div className="totalBar">
        <div>
          <span>Предварительно</span>
          <strong>{formatPrice(total)}</strong>
        </div>

        <button className="continueButton">
          Продолжить
          <ChevronRight size={20} />
        </button>
      </div>

      <nav className="bottomNav">
        <button className="navItem activeNav">
          <SlidersHorizontal size={21} />
          <span>Конфигуратор</span>
        </button>

        <button className="navItem">
          <ClipboardList size={21} />
          <span>Заказы</span>
        </button>

        <button className="navItem">
          <Car size={21} />
          <span>Автомобиль</span>
        </button>

        <button className="navItem">
          <Headphones size={21} />
          <span>Поддержка</span>
        </button>
      </nav>
    </div>
  );
}

