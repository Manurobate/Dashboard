# Story 2.2 : Connexion sécurisée avec rate limiting

Status: done

## Story

En tant qu'utilisateur non authentifié,
Je veux me connecter avec mon identifiant et mon mot de passe via un formulaire sécurisé,
Afin d'accéder à mon espace personnel Dashboard.

## Acceptance Criteria

1. **Étant donné** que `ADMIN_USERNAME` et `ADMIN_INITIAL_PASSWORD` sont renseignés dans `.env`,
   **Quand** le backend démarre et qu'aucun utilisateur avec `role = 'admin'` n'existe en base,
   **Alors** un compte admin est créé automatiquement avec `mustChangePassword = true` et le mot de passe hashé en bcrypt coût 12

2. **Étant donné** qu'un compte admin existe déjà en base,
   **Quand** le backend redémarre,
   **Alors** le seed est ignoré silencieusement — aucun doublon, aucune erreur

3. **Étant donné** que je saisis des identifiants valides,
   **Quand** je soumets le formulaire de connexion,
   **Alors** le backend valide le mot de passe (bcrypt ≥ cost 12), émet un JWT dans un httpOnly cookie (`SameSite=Strict`) et un refresh token haché (SHA-256) en DB + cookie httpOnly, puis le frontend redirige vers `/links`

4. **Étant donné** que je saisis des identifiants invalides,
   **Quand** je soumets le formulaire,
   **Alors** un message d'erreur générique s'affiche sous le formulaire (sans révéler si c'est l'identifiant ou le mot de passe qui est incorrect), les champs restent remplis

5. **Étant donné** que N tentatives consécutives échouent (rate limiting `@nestjs/throttler`),
   **Quand** je tente une nouvelle connexion,
   **Alors** le backend retourne 429 Too Many Requests et le formulaire affiche "Trop de tentatives, réessaie dans quelques instants"

6. **Étant donné** que l'application charge avec un JWT valide en cookie,
   **Quand** le guard Angular `authGuard` vérifie l'authentification,
   **Alors** l'utilisateur est redirigé directement vers `/links` sans afficher l'écran de login

## Tasks / Subtasks

- [x] **T1 — Mettre à jour `app.config.ts` (variables d'env)** (AC: #1, #3)
  - [x] Ajouter `ADMIN_USERNAME: Joi.string().required()` dans le schéma Joi
  - [x] Ajouter `ADMIN_INITIAL_PASSWORD: Joi.string().min(8).required()` dans le schéma Joi
  - [x] Ajouter `THROTTLER_TTL: Joi.number().default(60000)` (ms)
  - [x] Ajouter `THROTTLER_LIMIT: Joi.number().default(5)` (tentatives)
  - [x] Ajouter `CORS_ORIGIN: Joi.string().optional()` (ex: `http://localhost:4200` en dev)

- [x] **T2 — Configurer CORS dans `main.ts`** (prérequis frontend dev)
  - [x] Ajouter : `if (process.env.CORS_ORIGIN) { app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true }); }` après `app.use(cookieParser())`

- [x] **T3 — Créer `AdminSeedService`** (AC: #1, #2)
  - [x] Créer `backend/src/auth/admin-seed.service.ts` (voir Dev Notes pour l'implémentation)
  - [x] Implémenter `OnApplicationBootstrap` — cherche un user `role = 'admin'`, crée si absent
  - [x] Logger avec `new Logger(AdminSeedService.name)` — log info si création, log info si skip

- [x] **T4 — Créer `LocalStrategy`** (AC: #3, #4)
  - [x] Créer `backend/src/auth/strategies/local.strategy.ts`
  - [x] Étendre `PassportStrategy(Strategy)` de `passport-local`
  - [x] Appeler `authService.validateUser(username, password)`
  - [x] Retourner `false` (401) si user non trouvé, désactivé, ou mot de passe incorrect

- [x] **T5 — Créer `JwtStrategy`** (AC: #6)
  - [x] Créer `backend/src/auth/strategies/jwt.strategy.ts`
  - [x] Étendre `PassportStrategy(Strategy, 'jwt')` de `passport-jwt`
  - [x] Extraire le JWT depuis `req.cookies.jwt` (pas du header Authorization)
  - [x] Valider le payload : `{ sub: number, username: string, role: UserRole }`
  - [x] Retourner l'objet user minimal `{ id, username, role }` attaché à `req.user`

- [x] **T6 — Créer `LoginDto`** (AC: #3, #4)
  - [x] Créer `backend/src/auth/dto/login.dto.ts`
  - [x] `username: @IsString() @MaxLength(100)` (adresse la contrainte longueur déférée de 2.1)
  - [x] `password: @IsString() @MinLength(1)` (validation basique — bcrypt gère la vraie vérification)
  - [x] Ajouter `@ApiProperty()` sur les deux champs pour Swagger

- [x] **T7 — Créer `AuthService`** (AC: #1, #3, #4, #6)
  - [x] Créer `backend/src/auth/auth.service.ts` (voir Dev Notes pour l'implémentation complète)
  - [x] Méthode `validateUser` : `findByUsername` + vérification `isActive` + `bcrypt.compare`
  - [x] Méthode `login` : génère JWT + refresh token (voir schéma SHA-256 dans Dev Notes)
  - [x] Méthode `me(userId)` : retourne l'user sans `passwordHash`
  - [x] `InjectRepository(RefreshTokenEntity)` — première utilisation de l'entité dans un service

- [x] **T8 — Créer `AuthController`** (AC: #3, #4, #5, #6)
  - [x] Créer `backend/src/auth/auth.controller.ts` (voir Dev Notes)
  - [x] `POST /auth/login` avec `@UseGuards(LocalAuthGuard)` + `@Throttle({ default: { ttl, limit } })`
  - [x] Lire TTL et limit depuis `ConfigService` dans le guard ou le décorateur
  - [x] `GET /auth/me` avec `@UseGuards(JwtAuthGuard)` — retourne l'user sans passwordHash
  - [x] Écrire les cookies dans la réponse (voir Dev Notes pour les options cookie exactes)

- [x] **T9 — Créer `JwtAuthGuard` + `LocalAuthGuard` + `@CurrentUser()`** (AC: #3, #6)
  - [x] Créer `backend/src/common/guards/jwt-auth.guard.ts` (étend `AuthGuard('jwt')`)
  - [x] Créer `backend/src/common/guards/local-auth.guard.ts` (étend `AuthGuard('local')`)
  - [x] Créer `backend/src/common/decorators/current-user.decorator.ts` (lit `req.user`)

- [x] **T10 — Créer `AuthModule`** (AC: tous)
  - [x] Créer `backend/src/auth/auth.module.ts`
  - [x] `TypeOrmModule.forFeature([RefreshTokenEntity])` — adresse le déféré de 2.1
  - [x] `JwtModule.registerAsync({ inject: [ConfigService], useFactory: ... })` — secret + expiry depuis ConfigService
  - [x] `PassportModule.register({ defaultStrategy: 'jwt' })`
  - [x] Déclarer : `AuthController`, `AuthService`, `AdminSeedService`, `LocalStrategy`, `JwtStrategy`
  - [x] Exporter : `AuthService`, `JwtModule` (pour guards dans autres modules)
  - [x] Importer `UsersModule` (pour `UsersService`)

- [x] **T11 — Mettre à jour `AppModule`** (AC: #5)
  - [x] Importer `ThrottlerModule.forRootAsync({ inject: [ConfigService], useFactory: ... })` avec TTL/LIMIT depuis ConfigService
  - [x] Ajouter `APP_GUARD` provider pour `ThrottlerGuard` global
  - [x] Importer `AuthModule`

- [x] **T12 — Tests unitaires backend** (AC: tous)
  - [x] Créer `backend/src/auth/auth.service.spec.ts` — tester `validateUser` (user valide, user inexistant, désactivé, mauvais mdp) + `login` (vérifier cookies émis)
  - [x] Créer `backend/src/auth/auth.controller.spec.ts` — tester les routes avec mocks de `AuthService`

- [x] **T13 — Validation backend**
  - [x] `npm run build` → 0 erreur TypeScript
  - [x] `npm test` → tous les tests verts (19 tests, 4 suites)
  - [ ] `npm run start:dev` → démarre sans erreur, `POST /api/auth/login` accessible (test manuel requis avec DB)

- [x] **T14 — Créer `AuthService` Angular** (AC: #3, #6)
  - [x] Créer `frontend/src/app/core/services/auth.service.ts`
  - [x] `currentUser = signal<AuthUser | null>(null)`
  - [x] Méthode `login(username, password)` → `POST /api/auth/login` → met à jour `currentUser`
  - [x] Méthode `me()` → `GET /api/auth/me` → met à jour `currentUser`
  - [x] Interface `AuthUser { id: number; username: string; role: 'admin' | 'user'; mustChangePassword: boolean }`

- [x] **T15 — Créer `authGuard` Angular** (AC: #6)
  - [x] Créer `frontend/src/app/core/guards/auth.guard.ts` (functional guard)
  - [x] Si `authService.currentUser()` défini → laisser passer
  - [x] Sinon appeler `authService.me()` → si succès → laisser passer
  - [x] Si `me()` échoue (401) → `router.navigate(['/login'])`

- [x] **T16 — Créer `LoginComponent`** (AC: #3, #4, #5)
  - [x] Créer `frontend/src/app/auth/login/login.component.ts` (standalone, ChangeDetectionStrategy.OnPush)
  - [x] Créer le template `.html` + styles `.scss`
  - [x] Formulaire réactif : champs `username` + `password` avec validators `Validators.required`
  - [x] Appel `authService.login()` sur submit → succès : `router.navigate(['/links'])` → 401 : message générique → 429 : message rate limit
  - [x] Indicateur de loading pendant l'appel (désactiver le bouton submit)
  - [x] Si `authService.currentUser()` déjà défini au chargement → redirect vers `/links`
  - [x] Respecter le design "Noir & Braise" — `mat-card` centré, `mat-form-field`, `mat-flat-button`

- [x] **T17 — Créer l'intercepteur HTTP `credentials`** (prérequis cookies cross-origin en dev)
  - [x] Créer `frontend/src/app/core/interceptors/credentials.interceptor.ts`
  - [x] Cloner la requête avec `withCredentials: true` sur toutes les requêtes vers `/api/`
  - [x] Enregistrer dans `app.config.ts` via `withInterceptors([credentialsInterceptor])`

- [x] **T18 — Mettre à jour `app.routes.ts`** (AC: #6)
  - [x] Ajouter la route `/login` → `LoginComponent` (lazy, module `auth/`)
  - [x] Ajouter `canActivate: [authGuard]` sur `/links`, `/recipes`, `/notes`
  - [x] Mettre à jour la redirection par défaut `''` → `/links` (le guard redirigera vers `/login` si non authentifié)

- [x] **T19 — Mettre à jour `app.config.ts` Angular**
  - [x] Remplacer `withInterceptorsFromDi()` par `withInterceptors([credentialsInterceptor])`
  - [x] Supprimer `withInterceptorsFromDi()` (était un placeholder — déféré de 1.1)

- [x] **T20 — Validation frontend**
  - [x] `ng build` → 0 erreur TypeScript
  - [x] Tests vitest pré-existants inchangés (4 failed pré-existants, 0 régression introduite)
  - [ ] Tester manuellement : formulaire login → succès → redirection vers `/links` (test manuel requis)

### Review Findings

- [x] [Review][Patch] `.gitignore` — root `.env` non couvert après passage à `backend/.env` : risque de commit accidentel de secrets [`.gitignore:9`]
- [x] [Review][Patch] `LoginDto.username` — manque `@IsNotEmpty()` : une chaîne vide passe la validation et atteint la DB [`backend/src/auth/dto/login.dto.ts:7`]
- [x] [Review][Patch] `LoginDto.password` — `@MinLength(1)` autorise un espace seul, ajouter `@IsNotEmpty()` [`backend/src/auth/dto/login.dto.ts:12`]
- [x] [Review][Patch] `parseJwtExpiry` + Joi `JWT_EXPIRY` — cas limites non gérés (`'0m'`, négatif, `NaN`, entier seul sans suffixe) + aucun pattern Joi sur le format [`backend/src/auth/auth.controller.ts:253`]
- [x] [Review][Patch] Joi `ADMIN_USERNAME` / `ADMIN_INITIAL_PASSWORD` — manque `.trim()` : valeur tout-espace crée un compte admin inutilisable [`backend/src/config/app.config.ts:698`]
- [x] [Review][Patch] Joi `REFRESH_TOKEN_EXPIRY_DAYS` — manque `.min(1)` : valeur 0 ou négative crée des tokens immédiatement expirés [`backend/src/config/app.config.ts:701`]
- [x] [Review][Patch] `AuthService.me()` Angular — toutes les erreurs (5xx, réseau) traitées comme 401 → redirect `/login` sur erreur serveur transitoire [`frontend/src/app/core/services/auth.service.ts:1121`]
- [x] [Review][Patch] `AdminSeedService.onApplicationBootstrap` — pas de try/catch : une erreur DB au démarrage crashe le bootstrap sans message clair [`backend/src/auth/admin-seed.service.ts:123`]
- [x] [Review][Patch] `auth.controller.spec.ts` — assertion manquante sur `path: '/api/auth'` pour le cookie `refresh_token` [`backend/src/auth/auth.controller.spec.ts:213`]
- [x] [Review][Patch] `LoginComponent` — `CommonModule` inutile dans un composant standalone avec syntaxe `@if` [`frontend/src/app/auth/login/login.component.ts:989`]
- [x] [Review][Patch] `jwt.strategy.ts` — remplacer l'assertion `!` sur `JWT_SECRET` par `configService.getOrThrow('JWT_SECRET')` [`backend/src/auth/strategies/jwt.strategy.ts:619`]
- [x] [Review][Defer] Pas de rotation ni révocation des refresh tokens — sera traité en story 2.3/2.4 [`backend/src/auth/auth.service.ts:549`] — deferred, pre-existing
- [x] [Review][Defer] Race TOCTOU du seed admin (deux instances simultanées) — app mono-instance, à adresser si scale-out [`backend/src/auth/admin-seed.service.ts:124`] — deferred, pre-existing
- [x] [Review][Defer] Appels `me()` parallèles dans `authGuard` sans déduplication — improbable en mono-utilisateur [`frontend/src/app/core/guards/auth.guard.ts:1063`] — deferred, pre-existing
- [x] [Review][Defer] `req.user` typé `UserEntity` sous `JwtAuthGuard` alors que la strategy retourne `{ id, username, role }` — pas de bug actuel, maintenabilité future [`backend/src/auth/strategies/jwt.strategy.ts:623`] — deferred, pre-existing
- [x] [Review][Defer] docker-compose : cohérence `env_file` du service `db` après déplacement vers `backend/.env` [`docker-compose.yml:834`] — deferred, pre-existing
- [x] [Review][Defer] Cookie `refresh_token` `path: '/api/auth'` fragile si l'endpoint refresh est créé ailleurs — correct pour l'architecture actuelle [`backend/src/auth/auth.controller.ts:295`] — deferred, pre-existing
- [x] [Review][Defer] `isActive` non re-vérifié sur le path JWT : user désactivé garde l'accès 15 min — à adresser en story 2.4 [`backend/src/auth/auth.service.ts:565`] — deferred, pre-existing
- [x] [Review][Defer] Cast `any` sur `useFactory` de `JwtModule` — workaround documenté pour incompatibilité `StringValue` de `@types/jsonwebtoken` [`backend/src/auth/auth.module.ts:338`] — deferred, pre-existing

## Dev Notes

### Vue d'ensemble de la Story

Cette story implémente la couche d'authentification complète (login + seed admin) sur les deux stacks. **Elle ne couvre pas** le refresh silencieux (story 2.3), la déconnexion (story 2.4), ni le guard `mustChangePassword` (story 2.5).

**Déférés de story 2.1 adressés ici (obligatoires) :**
- `RefreshTokenEntity` non enregistrée → réglé dans `AuthModule` (T10)
- `isActive` non filtré dans `findByUsername` → réglé dans `AuthService.validateUser` (T7)
- Longueur `username` absente → réglé dans `LoginDto` (T6)
- Stockage SHA-256 des refresh tokens → implémenté dans `AuthService.login` (T7)

---

### T1 — `app.config.ts` mise à jour

```typescript
// backend/src/config/app.config.ts — schéma Joi augmenté
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: Joi.number().default(30),
  // Nouveaux (story 2.2)
  ADMIN_USERNAME: Joi.string().required(),
  ADMIN_INITIAL_PASSWORD: Joi.string().min(8).required(),
  THROTTLER_TTL: Joi.number().default(60000),   // ms — fenêtre de rate limiting
  THROTTLER_LIMIT: Joi.number().default(5),      // tentatives max par fenêtre
  CORS_ORIGIN: Joi.string().optional(),          // ex: 'http://localhost:4200' en dev seulement
});
```

**Note :** Mettre à jour `.env.example` et `backend/.env.example` avec ces nouvelles variables.

---

### T3 — `AdminSeedService`

```typescript
// backend/src/auth/admin-seed.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminCount = await this.userRepository.count({ where: { role: 'admin' } });
    if (adminCount > 0) {
      this.logger.log('Admin account already exists — skipping seed');
      return;
    }

    const username = this.configService.get<string>('ADMIN_USERNAME')!;
    const rawPassword = this.configService.get<string>('ADMIN_INITIAL_PASSWORD')!;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    await this.userRepository.save({
      username,
      passwordHash,
      role: 'admin',
      mustChangePassword: true,
      isActive: true,
    });
    this.logger.log(`Admin account "${username}" created (mustChangePassword=true)`);
  }
}
```

**Points critiques :**
- `@InjectRepository(UserEntity)` — `AdminSeedService` est dans `AuthModule` qui importe `UsersModule` ; mais `TypeOrmModule.forFeature([UserEntity])` est dans `UsersModule`, pas dans `AuthModule`. Pour que `AdminSeedService` puisse utiliser `Repository<UserEntity>`, il faut soit que `UsersModule` exporte `TypeOrmModule` (`exports: [TypeOrmModule]`), soit utiliser `UsersService` qui expose déjà l'accès. **Solution préférable : injecter `UsersService` et ajouter une méthode `findAdminCount()` + `createUser()` dans `UsersService`, pour ne pas briser l'encapsulation**. Voir T7 pour la mise à jour de `UsersService`.
- NE PAS logger le mot de passe en clair — ne logger que le username

---

### T4 — `LocalStrategy`

```typescript
// backend/src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserEntity } from '../../users/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'username', passwordField: 'password' });
  }

  async validate(username: string, password: string): Promise<UserEntity> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

---

### T5 — `JwtStrategy`

```typescript
// backend/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserRole } from '../../users/user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.jwt ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): { id: number; username: string; role: UserRole } {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
```

**Points critiques :**
- Extraction depuis `req.cookies.jwt` — NE PAS utiliser `fromAuthHeaderAsBearerToken()`
- `cookie-parser` est déjà configuré dans `main.ts` — les cookies sont disponibles sur `req.cookies`
- La stratégie jwt est nommée `'jwt'` (correspond à `AuthGuard('jwt')`)

---

### T7 — `AuthService` + mise à jour `UsersService`

**Mise à jour de `UsersService` (avant d'écrire `AuthService`) :**

Ajouter dans `backend/src/users/users.service.ts` :
```typescript
async findAdminCount(): Promise<number> {
  return this.userRepository.count({ where: { role: 'admin' } });
}

async createUser(data: { username: string; passwordHash: string; role: UserRole; mustChangePassword: boolean }): Promise<UserEntity> {
  const user = this.userRepository.create({ ...data, isActive: true });
  return this.userRepository.save(user);
}

async findById(id: number): Promise<UserEntity | null> {
  return this.userRepository.findOne({ where: { id } });
}
```

**`AuthService` complet :**

```typescript
// backend/src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/user.entity';

const BCRYPT_COST = 12;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  async validateUser(username: string, password: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async login(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Générer le refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex'); // 64 chars
    const tokenHash = sha256(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30),
    );

    await this.refreshTokenRepository.save({
      token: tokenHash, // SHA-256 hash en DB — jamais le raw token
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async me(userId: number): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'> | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const { passwordHash: _, refreshTokens: __, ...safeUser } = user;
    return safeUser;
  }
}
```

**Points critiques :**
- `validateUser` vérifie `isActive` avant bcrypt (évite le calcul bcrypt pour les comptes désactivés)
- Le raw refresh token est retourné par `login()` et placé dans un cookie httpOnly par le contrôleur
- **Jamais** stocker ou logger le raw token — seulement `sha256(rawToken)` en DB
- `passwordHash` est exclu de `me()` via destructuring — **ne jamais retourner `passwordHash` dans une réponse API**

---

### T8 — `AuthController`

```typescript
// backend/src/auth/auth.controller.ts
import { Controller, Post, Get, Req, Res, UseGuards, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../users/user.entity';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: {
    ttl: parseInt(process.env.THROTTLER_TTL ?? '60000'),
    limit: parseInt(process.env.THROTTLER_LIMIT ?? '5'),
  }})
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiBody({ type: LoginDto })
  async login(
    @Req() req: Request & { user: UserEntity },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');
    const refreshDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30);

    res.cookie('jwt', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseJwtExpiry(jwtExpiry),
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: '/api/auth', // refresh token cookie envoyé uniquement sur /api/auth/*
    });

    const { passwordHash: _, refreshTokens: __, ...safeUser } = req.user;
    return safeUser;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer l\'utilisateur courant' })
  async me(@CurrentUser() user: { id: number }) {
    return this.authService.me(user.id);
  }
}

// Helper : convertit '15m', '1h', '7d' en ms
function parseJwtExpiry(expiry: string): number {
  const n = parseInt(expiry);
  if (expiry.endsWith('m')) return n * 60 * 1000;
  if (expiry.endsWith('h')) return n * 60 * 60 * 1000;
  if (expiry.endsWith('d')) return n * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000; // fallback 15m
}
```

**Points critiques :**
- `@Res({ passthrough: true })` est obligatoire pour que NestJS gère le cycle de vie de la réponse tout en permettant de retourner un objet
- `secure: process.env.NODE_ENV === 'production'` — httpOnly en dev (HTTP), httpOnly+Secure en prod (HTTPS)
- Le cookie `refresh_token` est restreint à `path: '/api/auth'` — il n'est envoyé qu'aux endpoints d'auth, pas à toutes les routes API. Cela réduit la surface d'attaque.
- Le Throttle lit depuis `process.env` directement car `ConfigService` n'est pas disponible dans les décorateurs — c'est acceptable puisque les valeurs sont validées par Joi au démarrage

---

### T9 — Guards et Decorator

```typescript
// backend/src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// backend/src/common/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

```typescript
// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
```

---

### T10 — `AuthModule`

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminSeedService } from './admin-seed.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]), // adresse le déféré de 2.1
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRY', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminSeedService, LocalStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

### T11 — Mise à jour `AppModule`

```typescript
// backend/src/app.module.ts — modifications à apporter
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ... existants (ConfigModule, TypeOrmModule, UsersModule)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLER_TTL', 60000),
            limit: configService.get<number>('THROTTLER_LIMIT', 5),
          },
        ],
      }),
    }),
    AuthModule,
  ],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // ThrottlerGuard global
  ],
  controllers: [AppController],
})
export class AppModule {}
```

**Points critiques :**
- `ThrottlerGuard` global s'applique à toutes les routes par défaut — utiliser `@SkipThrottle()` sur les routes non concernées si nécessaire
- `AuthModule` après `ThrottlerModule` dans les imports

---

### T14 — `AuthService` Angular

```typescript
// frontend/src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(null);

  constructor(private readonly http: HttpClient) {}

  async login(username: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>('/api/auth/login', { username, password })
    );
    this.currentUser.set(user);
    return user;
  }

  async me(): Promise<AuthUser | null> {
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>('/api/auth/me'));
      this.currentUser.set(user);
      return user;
    } catch {
      this.currentUser.set(null);
      return null;
    }
  }
}
```

**Points critiques :**
- `currentUser` est un signal readonly pour les consommateurs — ne pas exposer le setter
- `login()` rejette si le serveur retourne 401 ou 429 — le composant catch ces erreurs
- `me()` ne rejette jamais — retourne `null` si non authentifié (guard peut l'appeler sans try/catch)

---

### T15 — `authGuard` Angular

```typescript
// frontend/src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) return true;

  const user = await authService.me();
  if (user) return true;

  return router.createUrlTree(['/login']);
};
```

---

### T16 — `LoginComponent`

```typescript
// frontend/src/app/auth/login/login.component.ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    // Si déjà authentifié → rediriger immédiatement
    if (this.authService.currentUser()) {
      void this.router.navigate(['/links']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { username, password } = this.form.getRawValue();
      await this.authService.login(username, password);
      await this.router.navigate(['/links']);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        this.errorMessage.set('Trop de tentatives, réessaie dans quelques instants');
      } else {
        this.errorMessage.set('Identifiant ou mot de passe incorrect');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

**Template `login.component.html` (structure) :**
```html
<div class="login-container">
  <mat-card class="login-card">
    <mat-card-header>
      <mat-card-title>Dashboard</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Identifiant</mat-label>
          <input matInput formControlName="username" autocomplete="username" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mot de passe</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password" />
        </mat-form-field>
        @if (errorMessage()) {
          <mat-error class="form-error">{{ errorMessage() }}</mat-error>
        }
        <button mat-flat-button color="primary" type="submit"
                [disabled]="form.invalid || isLoading()" class="full-width">
          @if (isLoading()) {
            <mat-progress-spinner diameter="20" mode="indeterminate" />
          } @else {
            Connexion
          }
        </button>
      </form>
    </mat-card-content>
  </mat-card>
</div>
```

---

### T17 — Intercepteur `credentials`

```typescript
// frontend/src/app/core/interceptors/credentials.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Ajouter withCredentials uniquement pour les appels API
  if (req.url.startsWith('/api/')) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
```

**Enregistrement dans `app.config.ts` :**
```typescript
import { withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor])), // remplace withInterceptorsFromDi()
    provideServiceWorker('ngsw-worker.js', { ... }),
  ],
};
```

---

### T18 — `app.routes.ts` Angular

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'links', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'links',
    canActivate: [authGuard],
    loadComponent: () => import('./links/links.component').then(m => m.LinksComponent),
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    loadComponent: () => import('./recipes/recipes.component').then(m => m.RecipesComponent),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./notes/notes.component').then(m => m.NotesComponent),
  },
  {
    path: 'share',
    loadChildren: () => import('./share/share.routes').then(r => r.shareRoutes),
  },
];
```

---

### Conventions Obligatoires (rappel)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables TypeORM | `PascalCase` | `RefreshToken`, `User` |
| Colonnes | `camelCase` | `userId`, `passwordHash`, `expiresAt` |
| Endpoints | Pluriel, kebab-case sous `/api/` | `/api/auth/login`, `/api/auth/me` |
| Réponses | Objet direct (pas d'enveloppe `{data: ...}`) | `{ id, username, role }` |
| Logs | `Logger` NestJS avec contexte | `new Logger(AuthService.name)` |
| Tests | `.spec.ts` co-localisés | `auth.service.spec.ts` à côté de `auth.service.ts` |
| Signaux Angular | `signal<T>` immutable | `this.currentUser.set(...)` |

### Arborescence Attendue Après cette Story

```
backend/src/
├── auth/
│   ├── admin-seed.service.ts      ← nouveau
│   ├── auth.controller.ts         ← nouveau
│   ├── auth.controller.spec.ts    ← nouveau
│   ├── auth.module.ts             ← nouveau
│   ├── auth.service.ts            ← nouveau
│   ├── auth.service.spec.ts       ← nouveau
│   ├── entities/
│   │   └── refresh-token.entity.ts (existant — ne pas modifier)
│   ├── strategies/
│   │   ├── jwt.strategy.ts        ← nouveau
│   │   └── local.strategy.ts      ← nouveau
│   └── dto/
│       └── login.dto.ts           ← nouveau
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      ← nouveau
│   │   └── local-auth.guard.ts    ← nouveau
│   └── decorators/
│       └── current-user.decorator.ts ← nouveau
├── users/
│   ├── users.service.ts           ← modifié (ajout findById, findAdminCount, createUser)
│   └── users.service.spec.ts      ← modifié (tests pour nouvelles méthodes)
├── config/
│   └── app.config.ts              ← modifié (nouvelles vars Joi)
├── app.module.ts                  ← modifié (ThrottlerModule + AuthModule)
└── main.ts                        ← modifié (CORS configurable)

frontend/src/app/
├── auth/
│   └── login/
│       ├── login.component.ts     ← nouveau
│       ├── login.component.html   ← nouveau
│       └── login.component.scss   ← nouveau
├── core/
│   ├── guards/
│   │   └── auth.guard.ts          ← nouveau
│   ├── interceptors/
│   │   └── credentials.interceptor.ts ← nouveau
│   └── services/
│       └── auth.service.ts        ← nouveau
├── app.routes.ts                  ← modifié (route login + authGuard)
└── app.config.ts                  ← modifié (withInterceptors)
```

### Anti-patterns à Éviter

- ❌ NE PAS stocker le raw refresh token en DB — seulement `sha256(rawToken)`
- ❌ NE PAS retourner `passwordHash` dans aucune réponse API
- ❌ NE PAS utiliser `Authorization: Bearer` pour les JWTs — extraction depuis cookie uniquement
- ❌ NE PAS ajouter `synchronize: true` dans TypeORM
- ❌ NE PAS muter les signals Angular directement (`this.currentUser().field = x` est interdit)
- ❌ NE PAS logger `ADMIN_INITIAL_PASSWORD` en clair
- ❌ NE PAS révéler si c'est l'identifiant ou le mot de passe qui est incorrect dans les messages d'erreur

### Références

- Story précédente : `_bmad-output/implementation-artifacts/2-1-entites-user-refreshtoken-migration-initiale.md`
- Épics : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2
- Architecture : `_bmad-output/planning-artifacts/architecture.md` — Section "Authentification & Sécurité", "Patterns d'Implémentation"
- Déférés en scope : `_bmad-output/implementation-artifacts/deferred-work.md` — section "Deferred from: code review de 2-1-..."
- Déféré CORS : `_bmad-output/implementation-artifacts/deferred-work.md` — section "Deferred from: code review de 1-1-..."

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-02)

### Debug Log References

- Erreur TS6133 : suppression du `Logger` inutilisé dans `AuthController` et `AuthService` (les logs sont dans `AdminSeedService`)
- Erreur TS1272 : passage à `import type { Request, Response }` dans `AuthController` pour respecter les contraintes `isolatedModules + emitDecoratorMetadata`
- Erreur TS2322 sur `JwtModuleOptions.signOptions.expiresIn` : cast `: any` sur le `useFactory` pour contourner la variance de type `StringValue` de `@types/jsonwebtoken`
- Tests vitest frontend pré-existants échouaient avant mes changements (4 fichiers spec, `describe is not defined`) — confirmé par `git stash` + run vitest
- `AdminSeedService` utilise `UsersService` (encapsulation) plutôt que `@InjectRepository(UserEntity)` directement, conformément aux Dev Notes

### Completion Notes List

- **Backend** : couche d'authentification complète — `AuthModule`, `AuthService`, `AuthController`, `AdminSeedService`, `LocalStrategy`, `JwtStrategy`, guards et décorateur `CurrentUser`
- **Backend** : `UsersService` enrichi de `findById`, `findAdminCount`, `createUser`
- **Backend** : `ThrottlerModule` global configuré via `ConfigService` ; `@Throttle` sur `POST /auth/login`
- **Backend** : cookies httpOnly `SameSite=Strict`, refresh token haché SHA-256 en DB
- **Frontend** : `AuthService` avec signal `currentUser`, `authGuard` fonctionnel, `LoginComponent` OnPush avec gestion 401/429
- **Frontend** : intercepteur `credentialsInterceptor` remplace `withInterceptorsFromDi()`
- **Tests** : 19 tests backend verts (4 suites), 0 régression ; `ng build` 0 erreur TypeScript
- **Déférés 2.1 adressés** : `RefreshTokenEntity` enregistrée dans `AuthModule`, `isActive` vérifié dans `validateUser`, longueur `username` dans `LoginDto`, hash SHA-256 refresh token

### File List

**Nouveaux fichiers :**
- `backend/src/auth/admin-seed.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.controller.spec.ts`
- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/auth/strategies/jwt.strategy.ts`
- `backend/src/auth/strategies/local.strategy.ts`
- `backend/src/common/guards/jwt-auth.guard.ts`
- `backend/src/common/guards/local-auth.guard.ts`
- `backend/src/common/decorators/current-user.decorator.ts`
- `frontend/src/app/auth/login/login.component.ts`
- `frontend/src/app/auth/login/login.component.html`
- `frontend/src/app/auth/login/login.component.scss`
- `frontend/src/app/core/guards/auth.guard.ts`
- `frontend/src/app/core/interceptors/credentials.interceptor.ts`
- `frontend/src/app/core/services/auth.service.ts`

**Modifiés :**
- `.env.example`
- `backend/src/app.module.ts`
- `backend/src/config/app.config.ts`
- `backend/src/main.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/users.service.spec.ts`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/app.routes.ts`

## Change Log

| Date | Description |
|------|-------------|
| 2026-05-02 | Implémentation complète story 2.2 — couche auth NestJS + Angular (login, seed admin, rate limiting, JWT cookie, authGuard) |
