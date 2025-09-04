/*
  Warnings:

  - The values [WEEKOFF] on the enum `Attendance_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Attendance` MODIFY `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY') NOT NULL;
