const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // 为下次.js、.jsx、.ts、.tsx文件提供Next.js应用的路径
  dir: './',
})

// 自定义Jest配置
const customJestConfig = {
  // 添加更多设置选项，在每次测试之前
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 如果使用TypeScript和绝对导入
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
  },
  
  testEnvironment: 'jest-environment-node',
  
  // 覆盖文件类型
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // 测试文件模式
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/tests/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // 忽略的文件/目录
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
}

// createJestConfig导出这样Next.js可以加载Next.js配置，这是异步的
module.exports = createJestConfig(customJestConfig) 