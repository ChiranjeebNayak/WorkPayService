-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `joinedDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Office` ADD COLUMN `breakTime` INTEGER NOT NULL DEFAULT 0;
