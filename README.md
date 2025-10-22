# NestJS Drizzle CRUD

A complete, type-safe CRUD abstraction layer for Drizzle ORM in NestJS applications. Supports PostgreSQL and MySQL with advanced features like soft delete, transactions, bulk operations, and full-text search.

## Features

- 🚀 **Complete CRUD Operations** - find, create, update, delete, and more
- 🗃️ **SQL Database Support** - PostgreSQL & MySQL with dialect-specific optimizations
- ⚡ **Type-Safe** - Full TypeScript support with generics
- 🔄 **Soft Delete** - Built-in soft delete with restore functionality
- 📦 **Bulk Operations** - Mass create, update, delete with transaction support
- 🔍 **Advanced Querying** - Filtering, pagination, sorting, full-text search
- 🎯 **NestJS Native** - Seamless integration with NestJS dependency injection
- 🧪 **Test Utilities** - Comprehensive testing helpers
- 🛡️ **Production Ready** - Error handling, transactions, and validation hooks

## Installation

```bash
npm install nestjs-drizzle-crud
```

# Quick Start

## 1. Basic Setup 

``` typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DrizzleCrudModule } from 'nestjs-drizzle-crud';

@Module({
  imports: [
    DrizzleCrudModule.forRoot({
      dialect: 'postgresql', // or 'mysql'
      defaults: {
        softDelete: true,
        timestamps: true,
        pagination: { defaultLimit: 20, maxLimit: 100 },
      },
    }),
  ],
})
export class AppModule {}
```

## 2. Create a CRUD Service

```
// user.service.ts
import { Injectable } from '@nestjs/common';
import { SqlBaseCrudService } from 'nestjs-drizzle-crud';

// Your Drizzle table schema
export const users = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  created_at: 'created_at',
  updated_at: 'updated_at',
  deleted_at: 'deleted_at',
};

// DTOs and interfaces
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserFilters {
  name?: string;
  email?: string;
}

@Injectable()
export class UserService extends SqlBaseCrudService<User, CreateUserDto, UpdateUserDto, UserFilters> {
  constructor(@Inject('DRIZZLE_DB') db: any) {
    super({
      dialect: 'postgresql',
      db,
      table: users,
      primaryKey: 'id',
      primaryKeyType: 'serial',
      softDelete: { enabled: true, column: 'deleted_at' },
      timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    });
  }

  protected async validateCreate(data: CreateUserDto): Promise<void> {
    if (!data.email.includes('@')) {
      throw new Error('Invalid email format');
    }
  }

  protected async validateUpdate(id: number, data: UpdateUserDto): Promise<void> {
    if (data.email && !data.email.includes('@')) {
      throw new Error('Invalid email format');
    }
  }

  protected mapCreateDtoToEntity(data: CreateUserDto): Record<string, any> {
    return {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  protected mapUpdateDtoToEntity(data: UpdateUserDto): Record<string, any> {
    return {
      ...data,
      updated_at: new Date(),
    };
  }

  // Custom methods
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }
}
```

## 3. Use in Controller

```
// user.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.userService.findAll({}, { page, limit });
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return this.userService.find(+id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.userService.softDelete(+id);
  }
}
```

## Advanced Usage

### Bulk Operations

```
// Mass create users
const users = await this.userService.massCreate(userDtos);

// Mass update
const updatedUsers = await this.userService.massUpdate(
  [1, 2, 3], 
  { status: 'active' }
);

// Mass soft delete
await this.userService.massSoftDelete([1, 2, 3]);
```

### Full-Text Search (PostgreSQL)

```
const results = await this.userService.fullTextSearch(
  'john doe',
  ['name', 'email', 'bio']
);
```

### Transactions

```
await this.userService.executeSqlTransaction(async (tx) => {
  await this.userService.create(user1, { transaction: tx });
  await this.userService.create(user2, { transaction: tx });
});
```

### Advanced Filtering

```
// Complex filters
const results = await this.userService.findAll({
  name: { like: 'John%' },
  age: { gt: 18, lt: 65 },
  status: { in: ['active', 'pending'] }
});

// With relations and selection
const user = await this.userService.find(1, {
  relations: ['profile', 'posts'],
  select: ['id', 'name', 'email']
});
```

# Module Configuration
## Async Configuration

``` 
DrizzleCrudModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    dialect: configService.get('DATABASE_DIALECT'),
    defaults: {
      softDelete: true,
      timestamps: true,
    },
  }),
  inject: [ConfigService],
}),
```

## Multiple Entities

```
DrizzleCrudModule.forFeature([
  {
    name: 'User',
    table: usersTable,
    service: UserService,
    config: { primaryKey: 'id' },
  },
  {
    name: 'Post', 
    table: postsTable,
    service: PostService,
    config: { softDelete: { enabled: false } },
  },
]),
```

# Testing
```
// user.service.spec.ts
import { TestCrudFactory } from 'nestjs-drizzle-crud/test-utils';

describe('UserService', () => {
  let service: UserService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = TestCrudFactory.createMockDb();
    const mockTable = TestCrudFactory.createMockTable();
    
    service = TestCrudFactory.createTestService(
      UserService,
      mockDb,
      mockTable
    );
  });

  it('should create user', async () => {
    const createDto = { name: 'John', email: 'john@test.com' };
    const mockEntity = TestCrudFactory.createMockEntity();
    
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockEntity]),
    });

    const result = await service.create(createDto);
    expect(result).toEqual(mockEntity);
  });
});
```

# API Reference
## Core Methods

* find(id, options?) - Find by primary key

* findOne(where, options?) - Find by criteria

* findAll(filters?, pagination?, options?) - Find all with filtering & pagination

* create(data, options?) - Create new entity

* update(id, data, options?) - Update entity

* softDelete(id, options?) - Soft delete entity

* restore(id, options?) - Restore soft-deleted entity

* delete(id, options?) - Hard delete entity

## Bulk Methods
* massCreate(data[], options?) - Create multiple entities

* massUpdate(ids[], data, options?) - Update multiple entities

* massSoftDelete(ids[], options?) - Soft delete multiple entities

* massRestore(ids[], options?) - Restore multiple entities

* massDelete(ids[], options?) - Hard delete multiple entities

## Utility Methods

* exists(id, options?) - Check if entity exists

* count(filters?, options?) - Count entities

* fullTextSearch(term, columns, pagination?, options?) - Full-text search (PostgreSQL)


# Configuration Options
```
interface SqlCrudConfig {
  dialect: 'postgresql' | 'mysql';
  db: any; // Drizzle database instance
  table: any; // Drizzle table
  
  // Primary key configuration
  primaryKey: string;
  primaryKeyType: 'serial' | 'bigserial' | 'int' | 'bigint' | 'uuid';
  
  // Soft delete
  softDelete?: {
    enabled: boolean;
    column: string;
  };
  
  // Timestamps
  timestamps?: {
    createdAt: string;
    updatedAt: string;
  };
  
  // Pagination
  pagination?: {
    defaultLimit: number;
    maxLimit: number;
  };
}
```

# Supported Versions
* NestJS: >=10.0.0

* Drizzle ORM: >=0.28.0

* Node.js: >=18.0.0

* PostgreSQL: >=12.0

* MySQL: >=8.0

# Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

# License
MIT


This README provides:

1. **Clear installation instructions**
2. **Quick start guide** with code examples
3. **Advanced usage patterns**
4. **Comprehensive API documentation**
5. **Testing examples**
6. **Configuration reference**
7. **Version compatibility**

It's ready to use and will help users understand how to implement your package quickly!
