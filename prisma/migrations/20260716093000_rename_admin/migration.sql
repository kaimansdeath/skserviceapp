-- DataMigration: перейменування керівника відділу на реальне ім'я
UPDATE "User" SET "name" = 'Комаров' WHERE "name" = 'Керівник відділу';
