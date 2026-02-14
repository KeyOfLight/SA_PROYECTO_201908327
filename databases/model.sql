CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('CLIENTE', 'RESTAURANTE', 'REPARTIDOR', 'ADMINISTRADOR') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password, role) VALUES
('admin@delivereats.com', '$2b$10$esY04Z8T5nKTvROr3m4VYubPWNOrFKQ80F8qUrphuzYx9N4NtXcNS', 'ADMINISTRADOR'),
('cliente@mail.com', '$2b$10$esY04Z8T5nKTvROr3m4VYubPWNOrFKQ80F8qUrphuzYx9N4NtXcNS', 'CLIENTE'),
('restaurante@mail.com', '$2b$10$esY04Z8T5nKTvROr3m4VYubPWNOrFKQ80F8qUrphuzYx9N4NtXcNS', 'RESTAURANTE'),
('repartidor@mail.com', '$2b$10$esY04Z8T5nKTvROr3m4VYubPWNOrFKQ80F8qUrphuzYx9N4NtXcNS', 'REPARTIDOR');


CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

CREATE TABLE restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    cuisine_type VARCHAR(100) DEFAULT 'General',
    opening_hours VARCHAR(100) DEFAULT '09:00-21:00',
    contact_phone VARCHAR(30) DEFAULT 'N/A',
    rating DECIMAL(3,2) DEFAULT 0.0,
    owner_id INT NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    stock INT DEFAULT 10,
    CONSTRAINT fk_menu_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);


INSERT INTO restaurants (name, address, owner_id)
VALUES ('Pizza Express', 'Zona 1, Guatemala', 3);

INSERT INTO menu_items (restaurant_id, name, description, price, available, stock) VALUES
(1, 'Pizza Pepperoni', 'Pizza grande con pepperoni', 75.00, TRUE, 20),
(1, 'Pizza Hawaiana', 'Pizza con piña y jamón', 70.00, TRUE, 20);


CREATE DATABASE IF NOT EXISTS order_db;
USE order_db;



CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,         
    restaurant_id INT NOT NULL,   
    status ENUM('CREADA', 'EN_PROCESO', 'FINALIZADA', 'RECHAZADA', 'CANCELADA') DEFAULT 'CREADA',
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL, -- referencia lógica a restaurant_db.menu_items
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);


INSERT INTO orders (user_id, restaurant_id, status, total)
VALUES (2, 1, 'CREADA', 145.00);

INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES
(1, 1, 1, 75.00),
(1, 2, 1, 70.00);


CREATE DATABASE IF NOT EXISTS delivery_db;
USE delivery_db;


CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,           
    delivery_user_id INT NOT NULL,  
    status ENUM('EN_CAMINO', 'ENTREGADO', 'CANCELADO') DEFAULT 'EN_CAMINO',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO deliveries (order_id, delivery_user_id, status)
VALUES (1, 4, 'EN_CAMINO');


CREATE DATABASE IF NOT EXISTS notification_db;
USE notification_db;


CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, 
    order_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO notifications (user_id, order_id, message)
VALUES
(2, 1, 'Su orden fue creada exitosamente'),
(2, 1, 'Su pedido está en camino');
