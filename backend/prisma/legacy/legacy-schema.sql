-- =============================================================================
-- OpenFlyers 1.3.1 Legacy Database Schema (reverse-engineered)
-- Database: pren_sql (MySQL)
-- Source: Aeroclub Firenze booking system (bookingaecfi subdomain)
--
-- This schema was reconstructed from PHP source code analysis.
-- Use it to understand the old data structure or to create a compatible
-- MySQL database for testing the migration script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: authentication
-- Main user/member table. Every user has a record here.
-- -----------------------------------------------------------------------------
CREATE TABLE authentication (
  NUM          INT          NOT NULL AUTO_INCREMENT,
  NAME         VARCHAR(100) NOT NULL,            -- login/username
  PASSWORD     VARCHAR(32)  NOT NULL DEFAULT '',  -- MD5 hash
  FIRST_NAME   VARCHAR(100) NOT NULL DEFAULT '',
  LAST_NAME    VARCHAR(100) NOT NULL DEFAULT '',
  PROFILE      INT          NOT NULL DEFAULT 0,   -- bitmask of assigned profile IDs
  EMAIL        VARCHAR(200) NOT NULL DEFAULT '',
  ADDRESS      TEXT,
  ZIPCODE      VARCHAR(20)  DEFAULT '',
  CITY         VARCHAR(100) DEFAULT '',
  STATE        VARCHAR(100) DEFAULT '',
  COUNTRY      VARCHAR(100) DEFAULT '',
  HOME_PHONE   VARCHAR(30)  DEFAULT '',
  WORK_PHONE   VARCHAR(30)  DEFAULT '',
  CELL_PHONE   VARCHAR(30)  DEFAULT '',
  VIEW_TYPE    INT          NOT NULL DEFAULT 0,   -- booking view preference
  VIEW_WIDTH   INT          NOT NULL DEFAULT 0,   -- booking view width preference
  NOTIFICATION INT          NOT NULL DEFAULT 0,   -- email notification bitmask
  LANG         VARCHAR(50)  DEFAULT '',           -- preferred language
  TIMEZONE     VARCHAR(50)  DEFAULT '',           -- preferred timezone
  PRIMARY KEY (NUM),
  UNIQUE KEY (NAME)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: members
-- Links authentication records to member-specific data.
-- A user is a "member" if they have a record in this table.
-- -----------------------------------------------------------------------------
CREATE TABLE members (
  NUM          INT          NOT NULL,             -- FK to authentication.NUM
  MEMBER_NUM   VARCHAR(50)  DEFAULT '',           -- club member number
  SUBSCRIPTION VARCHAR(20)  DEFAULT '0000-00-00', -- subscription expiry date (YYYY-MM-DD)
  PRIMARY KEY (NUM)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: instructors
-- A user is an "instructor" if they have a record here.
-- -----------------------------------------------------------------------------
CREATE TABLE instructors (
  INST_NUM   INT          NOT NULL,    -- FK to authentication.NUM
  SIGN       VARCHAR(3)   NOT NULL,    -- trigram (3-letter identifier)
  ORDER_NUM  INT          NOT NULL DEFAULT 0,  -- display order
  PRIMARY KEY (INST_NUM)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: aircrafts
-- Fleet inventory.
-- -----------------------------------------------------------------------------
CREATE TABLE aircrafts (
  NUM              INT          NOT NULL AUTO_INCREMENT,
  CALLSIGN         VARCHAR(20)  NOT NULL,
  TYPE             VARCHAR(100) NOT NULL DEFAULT '',
  FLIGHT_HOUR_COSTS VARCHAR(20) DEFAULT '',  -- hourly rate (stored as string)
  SEATS_AVAILABLE  INT          NOT NULL DEFAULT 1,
  COMMENTS         TEXT,
  ORDER_NUM        INT          NOT NULL DEFAULT 0,  -- display order
  non_bookable     TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (NUM)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: booking
-- Flight bookings / time slot reservations.
-- SLOT_TYPE: 0 = solo/alone, 1 = instruction (with instructor), 2 = maintenance
-- -----------------------------------------------------------------------------
CREATE TABLE booking (
  ID           INT      NOT NULL AUTO_INCREMENT,
  START_DATE   DATETIME NOT NULL,
  END_DATE     DATETIME NOT NULL,
  AIRCRAFT_NUM INT      NOT NULL,   -- FK to aircrafts.NUM
  MEMBER_NUM   INT      NOT NULL,   -- FK to authentication.NUM (pilot)
  SLOT_TYPE    INT      NOT NULL DEFAULT 0,
  INST_NUM     INT      NOT NULL DEFAULT 0,  -- FK to authentication.NUM (instructor), 0 = none
  FREE_SEATS   INT      NOT NULL DEFAULT 0,
  COMMENTS     TEXT,
  PRIMARY KEY (ID),
  KEY idx_start_end (START_DATE, END_DATE),
  KEY idx_aircraft (AIRCRAFT_NUM, START_DATE, END_DATE)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: qualification
-- Available license/certification types (PPL, SEP, medical, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE qualification (
  ID              INT          NOT NULL AUTO_INCREMENT,
  NAME            VARCHAR(100) NOT NULL,
  TIME_LIMITATION TINYINT(1)   NOT NULL DEFAULT 0,  -- 1 = has expiry date
  PRIMARY KEY (ID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: member_qualif
-- Links members to their qualifications (with optional expiry).
-- -----------------------------------------------------------------------------
CREATE TABLE member_qualif (
  MEMBERNUM  INT  NOT NULL,       -- FK to authentication.NUM
  QUALIFID   INT  NOT NULL,       -- FK to qualification.ID
  EXPIREDATE DATE NOT NULL DEFAULT '0000-00-00',  -- 0000-00-00 means no expiry
  NOALERT    TINYINT(1) NOT NULL DEFAULT 0,       -- suppress expiry warnings
  PRIMARY KEY (MEMBERNUM, QUALIFID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: aircraft_qualif
-- Defines which qualifications are required for each aircraft.
-- CHECKNUM groups qualifications into OR-groups (any one in a group suffices).
-- Different groups are AND-ed together.
-- -----------------------------------------------------------------------------
CREATE TABLE aircraft_qualif (
  AIRCRAFTNUM INT NOT NULL,  -- FK to aircrafts.NUM
  CHECKNUM    INT NOT NULL,  -- check group number
  QUALIFID    INT NOT NULL,  -- FK to qualification.ID
  PRIMARY KEY (AIRCRAFTNUM, CHECKNUM, QUALIFID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: profiles
-- Role/permission profiles. NUM is a power of 2 (bitmask-friendly).
-- Users have a PROFILE field that is the sum of assigned profile NUMs.
-- PERMITS is a bitmask of allowed actions.
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  NUM     INT          NOT NULL,
  NAME    VARCHAR(100) NOT NULL,
  PERMITS INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (NUM)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Profile PERMITS bitmask:
--   Bit  0 (1):        book_anytime           - can book outside normal hours
--   Bit  1 (2):        book_alone             - can book solo flights
--   Bit  2 (4):        book_instructor        - can book with instructor
--   Bit  3 (8):        freeze_aircraft        - can ground an aircraft
--   Bit  4 (16):       freeze_instructor      - can ground instructors
--   Bit  5 (32):       book_unfree_instructor - can book unavailable instructors
--   Bit  6 (64):       manage_users           - can manage user records
--   Bit  7 (128):      manage_own_qualifications - can edit own qualifications
--   Bit  8 (256):      manage_club            - club administrator
--   Bit  9 (512):      manage_aircraft        - can modify aircraft data
--   Bit 10 (1024):     manage_own_limitations - can set own limitations
--   Bit 11 (2048):     book_for_everybody     - can book/cancel for all users
--   Bit 23 (8388608):  book_any_duration      - no duration limits
--   Bit 24 (16777216): no_auto_logout         - exempt from session timeout

-- -----------------------------------------------------------------------------
-- Table: clubs
-- Club configuration (single-row, NUM=1).
-- -----------------------------------------------------------------------------
CREATE TABLE clubs (
  NUM                   INT          NOT NULL,
  NAME                  VARCHAR(200) NOT NULL DEFAULT '',
  INFO_CELL             TEXT,                   -- info message displayed on home
  LOGO                  LONGBLOB,               -- logo image binary
  LOGO_NAME             VARCHAR(200) DEFAULT '',
  LOGO_EXT              VARCHAR(50)  DEFAULT '', -- MIME type
  LOGO_SIZE             INT          DEFAULT 0,
  CLUB_SITE_URL         VARCHAR(255) DEFAULT '',
  STYLESHEET_URL        VARCHAR(255) DEFAULT '',
  FIRST_HOUR_DISPLAYED  TIME         NOT NULL DEFAULT '07:00:00',
  LAST_HOUR_DISPLAYED   TIME         NOT NULL DEFAULT '21:00:00',
  USUAL_PROFILES        INT          NOT NULL DEFAULT 0, -- default profile(s) for new users
  ICAO                  VARCHAR(10)  DEFAULT '',
  FLAGS                 INT          NOT NULL DEFAULT 0,  -- bit 0: same_day_box, bit 1: book_comment
  DEFAULT_SLOT_RANGE    INT          NOT NULL DEFAULT 60, -- default slot duration in minutes
  MIN_SLOT_RANGE        INT          NOT NULL DEFAULT 30, -- min slot duration in minutes
  MAILING_LIST_NAME     VARCHAR(200) DEFAULT '',
  MAILING_LIST_TYPE     VARCHAR(100) DEFAULT '',
  DEFAULT_TIMEZONE      VARCHAR(50)  DEFAULT 'UTC',
  LANG                  VARCHAR(50)  DEFAULT 'italiano',
  MAIL_FROM_ADDRESS     VARCHAR(200) DEFAULT '',
  ADMIN_NUM             INT          DEFAULT 0,
  PRIMARY KEY (NUM)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: parameter
-- Key-value configuration parameters.
-- Known codes: NO_OPENTIME_LIMIT, NO_VISIT_REFRESH, NO_CALLSIGN_DISPLAY,
--   BOOK_DATE_LIMITATION, BOOK_INSTRUCTION_MIN_TIME, BOOK_DURATION_LIMITATION,
--   QUALIF, BOOK_ALLOCATING_RULE, SUBSCRIPTION, FLIGHT
-- -----------------------------------------------------------------------------
CREATE TABLE parameter (
  CODE       VARCHAR(50) NOT NULL,
  ENABLED    INT         NOT NULL DEFAULT 0,
  INT_VALUE  INT         DEFAULT 0,
  CHAR_VALUE VARCHAR(200) DEFAULT '',
  PRIMARY KEY (CODE)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: icao
-- ICAO airfield reference data.
-- -----------------------------------------------------------------------------
CREATE TABLE icao (
  ICAO VARCHAR(10)  NOT NULL,
  NAME VARCHAR(200) NOT NULL,
  LAT  VARCHAR(20)  DEFAULT '',  -- e.g. "N43.810278"
  LON  VARCHAR(20)  DEFAULT '',  -- e.g. "E11.205000"
  ALT  INT          DEFAULT 0,   -- altitude in feet
  PRIMARY KEY (ICAO)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: regular_presence_inst_dates
-- Weekly recurring instructor availability (day+time ranges).
-- Days: 0=Sunday through 6=Saturday
-- -----------------------------------------------------------------------------
CREATE TABLE regular_presence_inst_dates (
  ID         INT  NOT NULL AUTO_INCREMENT,
  INST_NUM   INT  NOT NULL,      -- FK to authentication.NUM
  START_DAY  INT  NOT NULL,      -- 0-6 (Sunday=0)
  START_HOUR TIME NOT NULL,
  END_DAY    INT  NOT NULL,
  END_HOUR   TIME NOT NULL,
  PRIMARY KEY (ID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: exceptionnal_inst_dates
-- One-off instructor availability overrides.
-- PRESENCE: 1 = available (exception to absence), 0 = unavailable (exception to presence)
-- -----------------------------------------------------------------------------
CREATE TABLE exceptionnal_inst_dates (
  ID         INT      NOT NULL AUTO_INCREMENT,
  INST_NUM   INT      NOT NULL,    -- FK to authentication.NUM
  START_DATE DATETIME NOT NULL,
  END_DATE   DATETIME NOT NULL,
  PRESENCE   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (ID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: logs
-- Audit/activity log for booking operations.
-- -----------------------------------------------------------------------------
CREATE TABLE logs (
  ID      INT      NOT NULL AUTO_INCREMENT,
  DATE    DATETIME NOT NULL,
  USER    INT      NOT NULL,      -- FK to authentication.NUM
  MESSAGE TEXT,
  PRIMARY KEY (ID)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- -----------------------------------------------------------------------------
-- Table: sr_ss
-- Sunrise/sunset cache (can be purged and regenerated).
-- Structure not fully determined from code; excluded from migration.
-- -----------------------------------------------------------------------------
