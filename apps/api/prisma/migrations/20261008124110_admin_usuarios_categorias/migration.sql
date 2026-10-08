-- AlterTable
ALTER TABLE `space` ADD COLUMN `category` ENUM('ATMOS', 'SALA') NOT NULL DEFAULT 'SALA';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Space_category_active_idx` ON `Space`(`category`, `active`);

-- CreateIndex
CREATE INDEX `User_role_active_idx` ON `User`(`role`, `active`);

-- RenameIndex
ALTER TABLE `reservation` RENAME INDEX `Reservation_userId_fkey` TO `Reservation_userId_idx`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_companyId_fkey` TO `User_companyId_idx`;
