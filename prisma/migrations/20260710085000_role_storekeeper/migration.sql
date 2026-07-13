-- AlterEnum
-- Виносимо в окрему міграцію: PostgreSQL забороняє використовувати нове
-- значення enum у тій самій транзакції, де воно додається.
ALTER TYPE "Role" ADD VALUE 'STOREKEEPER';
