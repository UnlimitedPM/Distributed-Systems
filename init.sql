CREATE DATABASE IF NOT EXISTS stock_service;
USE stock_service;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `isin` VARCHAR(255) NOT NULL,
  `amount` INT NOT NULL,
  `price` INT DEFAULT 0,
  `state` INT DEFAULT 0,
  PRIMARY KEY (`id`)
);