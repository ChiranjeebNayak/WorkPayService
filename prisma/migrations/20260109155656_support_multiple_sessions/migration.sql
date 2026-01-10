/*
  Warnings:

  - You are about to drop the column `overTime` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `attendance` table. All the data in the column will be lost.
  - Made the column `checkInTime` on table `attendance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `attendance` DROP COLUMN `overTime`,
    DROP COLUMN `status`,
    ADD COLUMN `parentSessionId` INTEGER NULL,
    ADD COLUMN `sessionType` VARCHAR(191) NOT NULL DEFAULT 'WORK',
    MODIFY `checkInTime` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `Attendance_empId_date_idx` ON `Attendance`(`empId`, `date`);
