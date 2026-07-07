CREATE TABLE `ai_chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anomalies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiId` int NOT NULL,
	`kpiDataId` int,
	`assignmentId` int,
	`detectedForUserId` int,
	`description` text NOT NULL,
	`anomalyType` enum('OUT_OF_RANGE','SUDDEN_SPIKE','SUDDEN_DROP','MISSING_DATA','DUPLICATE_ENTRY','INCONSISTENT_TREND','THRESHOLD_BREACH') NOT NULL,
	`severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
	`status` enum('OPEN','INVESTIGATING','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
	`actualValue` decimal(15,4),
	`expectedMin` decimal(15,4),
	`expectedMax` decimal(15,4),
	`resolvedById` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `anomalies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('KPI_DATA','KPI_ASSIGNMENT','STRATEGIC_GOAL') NOT NULL DEFAULT 'KPI_DATA',
	`referenceId` int NOT NULL,
	`requestedById` int NOT NULL,
	`reviewedById` int,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`module` varchar(100) NOT NULL,
	`details` text,
	`ipAddress` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`headId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
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
CREATE TABLE `kpi_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiId` int NOT NULL,
	`assignedById` int NOT NULL,
	`assignedToId` int NOT NULL,
	`departmentId` int,
	`targetValue` decimal(15,4),
	`dueDate` varchar(20),
	`period` varchar(20) NOT NULL,
	`notes` text,
	`status` enum('PENDING','ACCEPTED','IN_PROGRESS','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`level` enum('ADFA_TO_HOD','HOD_TO_STAFF') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiId` int NOT NULL,
	`assignmentId` int,
	`actualValue` decimal(15,4) NOT NULL,
	`period` varchar(20) NOT NULL,
	`notes` text,
	`evidenceUrl` varchar(1000),
	`submittedById` int NOT NULL,
	`reviewedById` int,
	`status` enum('PENDING','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`perspective` enum('FINANCIAL','CUSTOMER','INTERNAL','LEARNING') NOT NULL,
	`targetValue` decimal(15,4) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`frequency` enum('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL') NOT NULL DEFAULT 'MONTHLY',
	`baseline` decimal(15,4),
	`weight` decimal(5,2) DEFAULT '1.00',
	`minThreshold` decimal(15,4),
	`maxThreshold` decimal(15,4),
	`status` enum('ACTIVE','INACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`goalId` int,
	`createdById` int NOT NULL,
	`fiscalYear` varchar(20) NOT NULL DEFAULT '2025/2026',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpis_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`type` enum('INFO','SUCCESS','WARNING','ERROR','KPI_ASSIGNED','KPI_SUBMITTED','KPI_APPROVED','KPI_REJECTED','ANOMALY_DETECTED') NOT NULL DEFAULT 'INFO',
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedId` int,
	`relatedType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `strategic_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`perspective` enum('FINANCIAL','CUSTOMER','INTERNAL','LEARNING') NOT NULL,
	`weight` decimal(5,2) DEFAULT '1.00',
	`status` enum('ACTIVE','INACTIVE','ACHIEVED') NOT NULL DEFAULT 'ACTIVE',
	`fiscalYear` varchar(20) NOT NULL DEFAULT '2025/2026',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255),
	`employeeId` varchar(50),
	`roleId` int NOT NULL DEFAULT 3,
	`departmentId` int,
	`status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
	`loginMethod` varchar(64) DEFAULT 'local',
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
