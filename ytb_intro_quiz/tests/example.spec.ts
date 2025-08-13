import { test, expect } from '@playwright/test';

test.describe('YouTube Quiz App', () => {
  test('should display homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main title is visible
    await expect(page).toHaveTitle(/YouTube.*Quiz/i);
    
    // Check for main navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should navigate to quiz creation page', async ({ page }) => {
    await page.goto('/');
    
    // Click on create quiz button
    await page.click('text=Create Quiz');
    
    // Should be on quiz creation page
    await expect(page).toHaveURL(/.*create/);
    
    // Check for form elements
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('should search for YouTube videos', async ({ page }) => {
    await page.goto('/create');
    
    // Enter YouTube URL
    const urlInput = page.locator('input[name="youtube-url"]');
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    // Click search button
    await page.click('button[type="submit"]');
    
    // Wait for video details to load
    await page.waitForSelector('.video-details', { timeout: 10000 });
    
    // Check if video information is displayed
    const videoTitle = page.locator('.video-title');
    await expect(videoTitle).toBeVisible();
  });

  test('should create a quiz question', async ({ page }) => {
    await page.goto('/create');
    
    // Add a question
    await page.click('text=Add Question');
    
    // Fill in question details
    const questionInput = page.locator('input[name="question"]').first();
    await questionInput.fill('What is the main topic of this video?');
    
    // Add answer options
    const answerInput = page.locator('input[name="answer"]').first();
    await answerInput.fill('Music');
    
    // Save question
    await page.click('text=Save Question');
    
    // Verify question was added
    const questionList = page.locator('.question-list');
    await expect(questionList).toContainText('What is the main topic');
  });

  test('should handle quiz submission', async ({ page }) => {
    await page.goto('/quiz/sample-quiz-id');
    
    // Answer questions
    await page.click('label:has-text("Option A")');
    
    // Submit quiz
    await page.click('button:has-text("Submit Quiz")');
    
    // Wait for results
    await page.waitForSelector('.quiz-results');
    
    // Check if score is displayed
    const score = page.locator('.score');
    await expect(score).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should handle login process', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 5000 });
    
    // Check if user is logged in
    const userMenu = page.locator('.user-menu');
    await expect(userMenu).toBeVisible();
  });
});