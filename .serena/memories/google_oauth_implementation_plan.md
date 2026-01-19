# Google OAuth Implementation Plan for Vocatify

## Project Analysis Summary

**Current State:**
- Next.js 15 App Router with TypeScript
- PostgreSQL + Prisma ORM
- Vercel serverless deployment
- NO existing authentication system
- Existing providers: MusicPlayerProvider, Toaster
- Navigation has placeholder user profile UI (href: null)

**Tech Stack:**
- React 18.3.1, Next.js 15.1.3
- Prisma 6.19.1, PostgreSQL (Neon serverless)
- shadcn/ui components with Radix UI
- Tailwind CSS for styling

---

## 1. TECHNOLOGY STACK RECOMMENDATION

### ✅ RECOMMENDED: NextAuth.js v5 (Auth.js)

**Rationale:**
1. **Next.js 15 Native Support**: Official authentication library for Next.js App Router
2. **Serverless Compatible**: Designed for edge runtime and serverless functions (Vercel)
3. **Built-in Google Provider**: First-class Google OAuth support out of the box
4. **Type Safety**: Full TypeScript support with typed sessions
5. **Prisma Adapter**: Official Prisma adapter for seamless database integration
6. **Session Management**: Built-in JWT + database sessions with automatic refresh
7. **Minimal Configuration**: Convention over configuration approach
8. **Production Ready**: Battle-tested, maintained by Vercel team

**Alternatives Considered:**
- **Clerk**: More features but paid tier required, overkill for simple OAuth
- **Supabase Auth**: Requires Supabase infrastructure, adds external dependency
- **Custom Implementation**: High maintenance, security risks, reinventing wheel

**Version:** Auth.js v5 (NextAuth.js v5 beta) - latest stable for Next.js 15

---

## 2. DATABASE SCHEMA DESIGN

### Prisma Models to Add

```prisma
// User authentication models (NextAuth.js standard schema)

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  accounts      Account[]
  sessions      Session[]
  
  // Future feature extensions
  favoriteSongs UserFavoriteSong[]
  playlists     UserPlaylist[]
  
  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
}

// Optional: Future feature tables

model UserFavoriteSong {
  id        String   @id @default(cuid())
  userId    String
  songId    Int
  createdAt DateTime @default(now())
  
  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  song songs @relation(fields: [songId], references: [vocadb_id], onDelete: Cascade)
  
  @@unique([userId, songId])
  @@index([userId])
  @@index([songId])
}

model UserPlaylist {
  id        String   @id @default(cuid())
  userId    String
  name      String
  isPublic  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  songs UserPlaylistSong[]
  
  @@index([userId])
}

model UserPlaylistSong {
  id         String   @id @default(cuid())
  playlistId String
  songId     Int
  position   Int
  addedAt    DateTime @default(now())
  
  playlist UserPlaylist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  
  @@unique([playlistId, songId])
  @@index([playlistId, position])
}
```

**Design Decisions:**
- `cuid()` for user IDs (collision-resistant, URL-safe)
- `@db.Text` for OAuth tokens (can exceed varchar limits)
- Cascade deletes for data integrity
- Strategic indexes for query performance
- Future-proof with favorite/playlist tables (initially unused)

---

## 3. FILE STRUCTURE & ORGANIZATION

```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts           # Auth.js API routes (NEW)
├── (auth)/                        # Route group for auth pages (NEW)
│   ├── signin/
│   │   └── page.tsx              # Custom sign-in page (NEW)
│   └── error/
│       └── page.tsx              # Auth error page (NEW)
├── layout.tsx                     # Root layout (MODIFY)
└── page.tsx                       # Home page (no changes)

components/
├── auth/                          # Auth components (NEW)
│   ├── SignInButton.tsx          # Sign in with Google button
│   ├── SignOutButton.tsx         # Sign out button
│   ├── UserAvatar.tsx            # User profile avatar
│   └── AuthGuard.tsx             # Protected route wrapper
├── HomeClient.tsx                 # Main client (MODIFY - add user menu)
└── NavigationSection.tsx          # Navigation (no changes)

lib/
├── auth/                          # Auth utilities (NEW)
│   ├── auth.ts                   # Auth.js configuration
│   ├── auth-options.ts           # NextAuth options
│   └── session.ts                # Session utilities
├── hooks/                         # Custom hooks (NEW)
│   └── useSession.ts             # Session hook wrapper
└── MusicPlayerContext.tsx         # Music player (no changes)

middleware.ts                      # Auth middleware (NEW)
```

**Key Additions:**
- `app/api/auth/[...nextauth]/route.ts`: Auth.js API handler
- `app/(auth)/*`: Authentication UI pages
- `components/auth/*`: Reusable auth components
- `lib/auth/*`: Auth configuration and utilities
- `middleware.ts`: Route protection

---

## 4. STEP-BY-STEP IMPLEMENTATION SEQUENCE

### Phase 1: Dependencies & Configuration (30 min)

**Step 1.1: Install Dependencies**
```bash
npm install next-auth@beta @auth/prisma-adapter
```

**Step 1.2: Update Environment Variables**
Add to `.env`:
```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth Credentials (from Google Cloud Console)
AUTH_GOOGLE_ID=<your-google-client-id>
AUTH_GOOGLE_SECRET=<your-google-client-secret>
```

Add to `.env.example`:
```env
# NextAuth.js (Authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

**Step 1.3: Google Cloud Console Setup**
1. Navigate to https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Production URI: `https://vocatify.vercel.app/api/auth/callback/google`

---

### Phase 2: Database Schema Migration (20 min)

**Step 2.1: Update Prisma Schema**
Add models from Section 2 to `prisma/schema.prisma`

**Step 2.2: Create Migration**
```bash
npx prisma migrate dev --name add_auth_tables
```

**Step 2.3: Verify Migration**
```bash
npx prisma studio  # Visual verification
```

---

### Phase 3: Auth.js Core Configuration (45 min)

**Step 3.1: Create Auth Configuration**
`lib/auth/auth.ts`:
```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/generated/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
});
```

**Step 3.2: Create API Route Handler**
`app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
```

**Step 3.3: Add Type Definitions**
`lib/auth/types.ts`:
```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

---

### Phase 4: Authentication UI Components (60 min)

**Step 4.1: Sign In Button**
`components/auth/SignInButton.tsx`:
```typescript
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="flex items-center gap-2"
    >
      <Chrome className="w-4 h-4" />
      Sign in with Google
    </Button>
  );
}
```

**Step 4.2: Sign Out Button**
`components/auth/SignOutButton.tsx`:
```typescript
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="ghost"
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </Button>
  );
}
```

**Step 4.3: User Avatar Component**
`components/auth/UserAvatar.tsx`:
```typescript
"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string | null;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ name, image, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {image && <AvatarImage src={image} alt={name || "User"} />}
      <AvatarFallback>
        {name ? name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
```

**Step 4.4: Sign In Page**
`app/(auth)/signin/page.tsx`:
```typescript
import { SignInButton } from "@/components/auth/SignInButton";
import { Music } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="max-w-md w-full p-8 bg-[#1a1a1a] rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <Music className="w-8 h-8 text-[#39c5bb]" />
            <h1 className="text-3xl font-bold text-white">Vocatify</h1>
          </div>
          
          <h2 className="text-xl text-white/80 text-center">
            보컬로이드 음악 차트에 오신 것을 환영합니다
          </h2>
          
          <p className="text-white/60 text-center text-sm">
            Google 계정으로 로그인하여 나만의 플레이리스트를 만들고
            <br />
            좋아하는 곡을 저장하세요
          </p>
          
          <SignInButton />
          
          <p className="text-white/40 text-xs text-center">
            로그인하면 서비스 약관 및 개인정보 처리방침에 동의하게 됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 5: UI Integration (45 min)

**Step 5.1: Create User Menu Component**
`components/auth/UserMenu.tsx`:
```typescript
"use client";

import { useSession } from "next-auth/react";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return <SignInButton />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#39c5bb]">
          <UserAvatar
            name={session.user.name}
            image={session.user.image}
            size="md"
          />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-white/10">
        <DropdownMenuLabel className="text-white">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{session.user.name}</p>
            <p className="text-xs text-white/60">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        <DropdownMenuItem className="text-white hover:bg-white/5">
          <User className="w-4 h-4 mr-2" />
          프로필
        </DropdownMenuItem>
        
        <DropdownMenuItem className="text-white hover:bg-white/5">
          <Settings className="w-4 h-4 mr-2" />
          설정
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        <DropdownMenuItem className="text-white hover:bg-white/5 p-0">
          <SignOutButton />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 5.2: Update HomeClient Navigation**
Modify `components/HomeClient.tsx` line 26-29:
```typescript
const personalItems = [
  { component: <UserMenu />, alt: "프로필" },
];
```

And update rendering section (around line 180-200):
```typescript
{/* Personal items - User menu */}
<div className="flex gap-[11px]">
  {personalItems.map((item, idx) => (
    <div key={idx}>
      {item.component}
    </div>
  ))}
</div>
```

**Step 5.3: Add Session Provider to Layout**
`app/layout.tsx`:
```typescript
import { SessionProvider } from "@/lib/auth/SessionProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          <MusicPlayerProvider>
            {children}
            <Toaster richColors position="top-center" />
          </MusicPlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

`lib/auth/SessionProvider.tsx`:
```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

---

### Phase 6: Route Protection (30 min)

**Step 6.1: Create Middleware**
`middleware.ts` (root level):
```typescript
export { auth as middleware } from "@/lib/auth/auth";

export const config = {
  matcher: [
    // Protected routes pattern
    // "/profile/:path*",
    // "/playlists/:path*",
  ],
};
```

**Step 6.2: Auth Guard Component (Optional)**
`components/auth/AuthGuard.tsx`:
```typescript
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return fallback || <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
```

---

### Phase 7: Testing & Validation (45 min)

**Step 7.1: Local Development Testing**
```bash
npm run dev
```

Test scenarios:
1. ✓ Click "Sign in with Google" → Google OAuth flow
2. ✓ Verify redirect to homepage after sign-in
3. ✓ Check user avatar displays in navigation
4. ✓ Open user menu → verify name, email, sign out
5. ✓ Sign out → verify redirect and UI update
6. ✓ Database verification via Prisma Studio

**Step 7.2: Database Verification**
```bash
npx prisma studio
```
Check tables:
- User (populated with Google profile data)
- Account (Google provider record)
- Session (active session token)

**Step 7.3: Error Handling Tests**
- Test OAuth cancellation
- Test network errors
- Test session expiration
- Test invalid credentials

---

## 5. ENVIRONMENT VARIABLES REQUIRED

### Development (.env)
```env
# Existing variables
DATABASE_URL="postgresql://..."
YOUTUBE_API_KEY="..."
CRON_SECRET="..."

# New authentication variables
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
```

### Production (Vercel Environment Variables)
```
NEXTAUTH_URL → https://vocatify.vercel.app
NEXTAUTH_SECRET → (same as development, stored securely)
AUTH_GOOGLE_ID → (Google Cloud Console production credentials)
AUTH_GOOGLE_SECRET → (Google Cloud Console production credentials)
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 6. UI/UX INTEGRATION POINTS

### Navigation Bar (HomeClient.tsx)
**Current State:**
```typescript
const personalItems = [
  { icon: User, alt: "프로필", href: null },
  { icon: User, alt: "설정", href: null },
];
```

**Updated State:**
```typescript
const personalItems = [
  { component: <UserMenu />, alt: "프로필" },
];
```

**Visual Changes:**
- Replace placeholder User icon with UserMenu component
- Show avatar when signed in
- Show "Sign in with Google" button when signed out
- Dropdown menu on avatar click:
  - User name and email
  - Profile link (future feature)
  - Settings link (future feature)
  - Sign out button

### Sign In Page (/signin)
- Centered card layout matching Vocatify design
- Vocatify logo and branding
- Google sign-in button with icon
- Korean language copy
- Terms of service notice
- Dark theme matching existing UI (#0a0a0a background)

### Protected Routes (Future)
- Wrap components with `<AuthGuard>`
- Middleware protection for route patterns
- Automatic redirect to /signin for unauthenticated users

---

## 7. SECURITY CONSIDERATIONS

### OAuth Security
✓ **CSRF Protection**: Built into Auth.js
✓ **State Parameter**: Automatic OAuth state validation
✓ **Secure Cookies**: HTTP-only, secure, SameSite=Lax
✓ **Token Storage**: Database-backed sessions (not JWT in localStorage)

### Environment Variables
✓ **Secret Management**: Never commit .env to git
✓ **Vercel Secrets**: Use Vercel dashboard for production secrets
✓ **Key Rotation**: Document NEXTAUTH_SECRET rotation procedure

### Database Security
✓ **Cascade Deletes**: User deletion removes all related records
✓ **Indexed Queries**: Performance optimization prevents DoS
✓ **Connection Pooling**: Neon PgBouncer prevents connection exhaustion

### Session Management
✓ **30-Day Expiration**: Automatic session cleanup
✓ **Database Sessions**: Server-side validation, no client tampering
✓ **Secure Transmission**: HTTPS only in production

### Rate Limiting (Future Enhancement)
- Implement rate limiting on /api/auth/signin
- Use Vercel Edge Config or Upstash for distributed rate limiting

---

## 8. TESTING STRATEGY

### Unit Testing (Jest + React Testing Library)
```typescript
// components/auth/__tests__/SignInButton.test.tsx
describe('SignInButton', () => {
  it('calls signIn with google provider on click', () => {
    const signInMock = jest.fn();
    (signIn as jest.Mock) = signInMock;
    
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button'));
    
    expect(signInMock).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });
});
```

### Integration Testing (Playwright)
```typescript
test('complete OAuth flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign in with Google');
  
  // Google OAuth simulation
  await page.waitForURL('**/signin/google');
  // ... OAuth flow steps
  
  await page.waitForURL('/');
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
});
```

### Manual Testing Checklist
- [ ] Sign in flow completes successfully
- [ ] User profile data displays correctly
- [ ] Session persists across page refreshes
- [ ] Sign out clears session
- [ ] Protected routes redirect unauthenticated users
- [ ] Mobile responsive UI
- [ ] Keyboard navigation works
- [ ] Screen reader accessibility

### Database Testing
```bash
# Test migration rollback
npx prisma migrate reset

# Test schema validation
npx prisma validate

# Test data seeding
npx prisma db seed
```

---

## 9. PRODUCTION DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Run production build: `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Test OAuth flow in staging environment
- [ ] Update Google Cloud Console authorized URIs
- [ ] Configure Vercel environment variables
- [ ] Review Neon database connection limits

### Deployment
- [ ] Deploy to Vercel
- [ ] Verify NEXTAUTH_URL matches production domain
- [ ] Test sign in/out in production
- [ ] Monitor error logs in Vercel dashboard
- [ ] Check database session creation in Neon

### Post-Deployment
- [ ] Monitor user sign-in metrics
- [ ] Check session table growth rate
- [ ] Verify email collection compliance (GDPR/privacy)
- [ ] Document user data retention policy
- [ ] Set up automated session cleanup (optional cron)

---

## 10. FUTURE ENHANCEMENTS

### Phase 2 Features (Post-MVP)
1. **User Favorites**
   - Implement UserFavoriteSong table usage
   - Add favorite button to song cards
   - Create /favorites page

2. **User Playlists**
   - Activate UserPlaylist tables
   - Drag-and-drop playlist builder
   - Public/private playlist sharing

3. **Social Features**
   - User profiles with listening history
   - Follow other users
   - Collaborative playlists

4. **Advanced Auth**
   - Email/password provider
   - Magic link authentication
   - Two-factor authentication

### Performance Optimizations
- Implement session caching with Redis
- Add rate limiting on authentication endpoints
- Optimize database queries with connection pooling

---

## IMPLEMENTATION TIMELINE

**Total Estimated Time: 4-5 hours**

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | 30 min | Dependencies & environment setup |
| Phase 2 | 20 min | Database schema migration |
| Phase 3 | 45 min | Auth.js core configuration |
| Phase 4 | 60 min | UI components development |
| Phase 5 | 45 min | Navigation integration |
| Phase 6 | 30 min | Route protection setup |
| Phase 7 | 45 min | Testing & validation |

**Buffer Time:** +30 min for debugging and edge cases

---

## ROLLBACK PLAN

If issues arise during implementation:

1. **Database Rollback:**
   ```bash
   npx prisma migrate reset
   ```

2. **Code Rollback:**
   ```bash
   git reset --hard HEAD~1
   ```

3. **Dependency Rollback:**
   ```bash
   npm uninstall next-auth @auth/prisma-adapter
   git checkout package.json package-lock.json
   npm install
   ```

4. **Environment Cleanup:**
   - Remove AUTH_* variables from .env
   - Revert NEXTAUTH_URL and NEXTAUTH_SECRET

---

## SUCCESS CRITERIA

✅ **Functional Requirements:**
- Users can sign in with Google OAuth
- User session persists across navigation
- User profile displays in navigation bar
- Sign out functionality works correctly

✅ **Technical Requirements:**
- Zero build errors
- TypeScript type safety maintained
- Prisma migrations applied successfully
- Database constraints validated

✅ **User Experience:**
- Sign-in flow completes in <5 seconds
- UI matches existing design language
- Mobile responsive layout
- Accessible keyboard navigation

✅ **Security:**
- HTTPS enforced in production
- Secrets stored securely in Vercel
- CSRF protection active
- Database sessions encrypted

---

## SUPPORT & RESOURCES

**Documentation:**
- Auth.js: https://authjs.dev/
- NextAuth.js Migration: https://authjs.dev/guides/upgrade-to-v5
- Prisma Adapter: https://authjs.dev/reference/adapter/prisma
- Google OAuth: https://developers.google.com/identity/protocols/oauth2

**Community:**
- Auth.js Discord: https://discord.gg/authjs
- Next.js Discord: https://discord.gg/nextjs
- Stack Overflow: #next-auth tag

**Troubleshooting:**
- Check `app/api/auth/error` for OAuth errors
- Verify callback URL matches Google Console exactly
- Ensure DATABASE_URL has correct SSL settings
- Monitor Vercel function logs for runtime errors
