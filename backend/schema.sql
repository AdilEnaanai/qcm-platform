-- QCM Platform Database Schema
-- MySQL

CREATE DATABASE IF NOT EXISTS qcm_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qcm_platform;

-- Users (professors/admins)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'professor') DEFAULT 'professor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_per_question INT DEFAULT 30,  -- seconds per question
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  require_location BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  question_text TEXT NOT NULL,
  media_type ENUM('none', 'image', 'video', 'audio') DEFAULT 'none',
  media_url VARCHAR(500),
  points INT DEFAULT 1,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Answer choices
CREATE TABLE IF NOT EXISTS choices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  choice_text VARCHAR(500) NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Candidates (students who take exams)
CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  apogee_code VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  score DECIMAL(5, 2),
  total_questions INT,
  correct_answers INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  UNIQUE KEY unique_candidate_exam (exam_id, apogee_code),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Candidate answers
CREATE TABLE IF NOT EXISTS candidate_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  question_id INT NOT NULL,
  choice_id INT,
  is_correct BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_exams_professor ON exams(professor_id);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_choices_question ON choices(question_id);
CREATE INDEX idx_candidates_exam ON candidates(exam_id);
CREATE INDEX idx_answers_candidate ON candidate_answers(candidate_id);
