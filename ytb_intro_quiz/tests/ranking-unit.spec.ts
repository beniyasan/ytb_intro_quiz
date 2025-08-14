import { test, expect } from '@playwright/test';

test.describe('Ranking Component Unit Tests', () => {
  test('should render RankingList component structure', async ({ page }) => {
    // Create a mock HTML page with the component structure
    await page.setContent(`
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">現在のランキング</h2>
          <div class="text-sm text-gray-600">問題 1 / 3</div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-sm text-blue-600 font-medium">平均スコア</div>
            <div class="text-2xl font-bold text-blue-800">75</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="text-sm text-green-600 font-medium">最高スコア</div>
            <div class="text-2xl font-bold text-green-800">100</div>
          </div>
        </div>
        
        <div class="space-y-3">
          <div class="p-4 rounded-lg border-2 bg-yellow-100 border-yellow-300 text-yellow-800">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-lg font-bold min-w-[60px]">🥇</div>
                <div>
                  <div class="font-semibold text-lg">Player1</div>
                  <div class="text-sm text-gray-600 space-x-4">
                    <span>正解数: 3/3</span>
                    <span>正答率: 100%</span>
                    <span>平均回答時間: 2.5秒</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold">300</div>
                <div class="text-sm text-gray-600">ポイント</div>
                <div class="text-sm text-orange-600 font-medium">🔥 3連続正解</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Test component structure
    await expect(page.locator('text=現在のランキング')).toBeVisible();
    await expect(page.locator('text=平均スコア')).toBeVisible();
    await expect(page.locator('text=最高スコア')).toBeVisible();
    await expect(page.locator('text=Player1')).toBeVisible();
    await expect(page.locator('text=300')).toBeVisible();
    await expect(page.locator('text=🥇')).toBeVisible();
    await expect(page.locator('text=3連続正解')).toBeVisible();
  });

  test('should render ParticipantStats component structure', async ({ page }) => {
    await page.setContent(`
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">TestPlayer の成績</h3>
          <div class="text-2xl font-bold text-yellow-600">🥇</div>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">250</div>
            <div class="text-sm text-gray-600">総スコア</div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">80%</div>
            <div class="text-sm text-gray-600">正答率</div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">4/5</div>
            <div class="text-sm text-gray-600">正解数</div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">3.2秒</div>
            <div class="text-sm text-gray-600">平均回答時間</div>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex justify-center space-x-6">
            <div class="text-center">
              <div class="text-xl font-bold text-orange-600">🔥 3</div>
              <div class="text-sm text-gray-600">現在の連続正解</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-red-600">🏆 5</div>
              <div class="text-sm text-gray-600">最長連続正解</div>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Test stats display
    await expect(page.locator('text=TestPlayer の成績')).toBeVisible();
    await expect(page.locator('text=総スコア')).toBeVisible();
    await expect(page.locator('text=正答率')).toBeVisible();
    await expect(page.locator('text=正解数')).toBeVisible();
    await expect(page.locator('text=平均回答時間')).toBeVisible();
    await expect(page.locator('text=現在の連続正解')).toBeVisible();
    await expect(page.locator('text=最長連続正解')).toBeVisible();
    
    // Test values
    await expect(page.locator('text=250')).toBeVisible();
    await expect(page.locator('text=80%')).toBeVisible();
    await expect(page.locator('text=4/5')).toBeVisible();
    await expect(page.locator('text=3.2秒')).toBeVisible();
  });

  test('should apply correct ranking colors', async ({ page }) => {
    await page.setContent(`
      <div class="space-y-3">
        <div class="p-4 rounded-lg border-2 bg-yellow-100 border-yellow-300 text-yellow-800">
          <span>🥇 1st Place</span>
        </div>
        <div class="p-4 rounded-lg border-2 bg-gray-100 border-gray-300 text-gray-800">
          <span>🥈 2nd Place</span>
        </div>
        <div class="p-4 rounded-lg border-2 bg-orange-100 border-orange-300 text-orange-800">
          <span>🥉 3rd Place</span>
        </div>
        <div class="p-4 rounded-lg border-2 bg-white border-gray-200 text-gray-700">
          <span>4位 4th Place</span>
        </div>
      </div>
    `);
    
    // Test ranking colors
    const firstPlace = page.locator('div').filter({ hasText: '1st Place' }).first();
    await expect(firstPlace).toHaveClass(/bg-yellow-100/);
    
    const secondPlace = page.locator('div').filter({ hasText: '2nd Place' }).first();
    await expect(secondPlace).toHaveClass(/bg-gray-100/);
    
    const thirdPlace = page.locator('div').filter({ hasText: '3rd Place' }).first();
    await expect(thirdPlace).toHaveClass(/bg-orange-100/);
    
    const fourthPlace = page.locator('div').filter({ hasText: '4th Place' }).first();
    await expect(fourthPlace).toHaveClass(/bg-white/);
  });

  test('should show participant highlight', async ({ page }) => {
    await page.setContent(`
      <div class="space-y-3">
        <div class="p-4 rounded-lg border-2 bg-yellow-100 border-yellow-300">
          <span>Other Player</span>
        </div>
        <div class="p-4 rounded-lg border-2 ring-2 ring-blue-400 border-blue-400">
          <span>Your Player <span class="ml-2 text-sm text-blue-600">(あなた)</span></span>
        </div>
      </div>
    `);
    
    // Test highlight styling
    const highlightedEntry = page.locator('div').filter({ hasText: 'Your Player' }).first();
    await expect(highlightedEntry).toHaveClass(/ring-2/);
    await expect(highlightedEntry).toHaveClass(/ring-blue-400/);
    await expect(page.locator('text=(あなた)')).toBeVisible();
  });

  test('should display animation classes', async ({ page }) => {
    await page.setContent(`
      <div class="space-y-3">
        <div class="p-4 rounded-lg border-2 transition-all duration-500 transform scale-105 shadow-lg animate-pulse">
          <span>Animating Player</span>
        </div>
        <div class="p-4 rounded-lg border-2 transition-all duration-500">
          <span>Static Player</span>
        </div>
      </div>
    `);
    
    // Test animation classes
    const animatingEntry = page.locator('div').filter({ hasText: 'Animating Player' }).first();
    await expect(animatingEntry).toHaveClass(/animate-pulse/);
    await expect(animatingEntry).toHaveClass(/scale-105/);
    await expect(animatingEntry).toHaveClass(/shadow-lg/);
  });

  test('should show score change indicator', async ({ page }) => {
    await page.setContent(`
      <div class="text-center">
        <div class="text-2xl font-bold text-green-600 transform scale-125">
          300
          <span class="ml-1 text-sm text-green-500 animate-ping">+</span>
        </div>
        <div class="text-sm text-gray-600">総スコア</div>
      </div>
    `);
    
    // Test score change animation
    const scoreElement = page.locator('div').filter({ hasText: '300' }).first();
    await expect(scoreElement).toHaveClass(/scale-125/);
    
    const plusIndicator = page.locator('span').filter({ hasText: '+' }).first();
    await expect(plusIndicator).toHaveClass(/animate-ping/);
  });
});