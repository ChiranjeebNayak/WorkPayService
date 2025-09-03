/*
  Warnings:

  - Added the required column `status` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Attendance` ADD COLUMN `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'WEEKOFF', 'HOLIDAY') NOT NULL;
