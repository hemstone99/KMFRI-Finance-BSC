CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`departmentId` int NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`allocatedAmount` decimal(15,2) NOT NULL,
	`spentAmount` decimal(15,2) DEFAULT '0.00',
	`remainingAmount` decimal(15,2) NOT NULL,
	`status` enum('ACTIVE','CLOSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiDataId` int,
	`assignmentId` int,
	`uploadedById` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int,
	`description` text,
	`status` enum('ACTIVE','ARCHIVED','DELETED') NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_balance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('ANNUAL','SICK','COMPASSIONATE','MATERNITY','PATERNITY','UNPAID','OTHER') NOT NULL,
	`totalDays` int NOT NULL,
	`usedDays` int NOT NULL DEFAULT 0,
	`remainingDays` int NOT NULL,
	`fiscalYear` varchar(20) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_balance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('ANNUAL','SICK','COMPASSIONATE','MATERNITY','PATERNITY','UNPAID','OTHER') NOT NULL,
	`startDate` varchar(20) NOT NULL,
	`endDate` varchar(20) NOT NULL,
	`days` int NOT NULL,
	`reason` text,
	`status` enum('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`approvedById` int,
	`approvalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
