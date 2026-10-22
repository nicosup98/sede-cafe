<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top Navbar -->
    <header class="navbar bg-base-100 shadow-sm border-b border-base-300 px-4 lg:px-8 sticky top-0 z-30">
      <div class="navbar-start gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xl shadow">
            ☕
          </div>
          <div>
            <div class="font-extrabold text-lg leading-none flex items-center gap-2">
              <span>Sede Café</span>
              <span class="badge badge-sm badge-secondary hidden sm:inline-flex">Semanal</span>
            </div>
            <p class="text-xs text-base-content/80 hidden sm:block">Asignación equitativa de turnos de café</p>
          </div>
        </div>
      </div>

      <!-- Center Tabs (Desktop) -->
      <div class="navbar-center hidden lg:flex">
        <div role="tablist" class="tabs tabs-boxed rounded-full bg-base-200/90 p-1.5 border border-base-300 shadow-inner gap-1">
          <button
            role="tab"
            class="tab rounded-full gap-1.5 font-medium px-4 transition-all duration-200"
            :class="{ 'tab-active !rounded-full shadow-sm': activeTab === 'schedule' }"
            @click="activeTab = 'schedule'"
          >
            <span>📅</span>
            <span>Calendario Semanal</span>
          </button>
          <button
            role="tab"
            class="tab rounded-full gap-1.5 font-medium px-4 transition-all duration-200"
            :class="{ 'tab-active !rounded-full shadow-sm': activeTab === 'swaps' }"
            @click="activeTab = 'swaps'"
          >
            <span>🔄</span>
            <span>Intercambios</span>
            <span v-if="actionableSwapsCount > 0" class="badge badge-warning badge-sm font-bold">
              {{ actionableSwapsCount }}
            </span>
          </button>
          <button
            role="tab"
            class="tab rounded-full gap-1.5 font-medium px-4 transition-all duration-200"
            :class="{ 'tab-active !rounded-full shadow-sm': activeTab === 'equity' }"
            @click="activeTab = 'equity'"
          >
            <span>⚖️</span>
            <span>Equidad y Conteo</span>
          </button>
          <button
            role="tab"
            class="tab rounded-full gap-1.5 font-medium px-4 transition-all duration-200"
            :class="{ 'tab-active !rounded-full shadow-sm': activeTab === 'users' }"
            @click="activeTab = 'users'"
          >
            <span>👥</span>
            <span>Usuarios y Permisos</span>
          </button>
        </div>
      </div>

      <!-- Right User Controls -->
      <div class="navbar-end gap-2">
        <!-- PWA Push Notifications Button / Dropdown -->
        <div class="dropdown dropdown-end">
          <div
            tabindex="0"
            role="button"
            class="btn btn-ghost btn-sm btn-circle relative"
            :title="isSubscribed ? 'Notificaciones Push activadas' : 'Activar Notificaciones Push'"
          >
            <span class="text-lg">🔔</span>
            <span
              v-if="isSubscribed"
              class="w-2.5 h-2.5 rounded-full bg-success absolute top-1.5 right-1.5 ring-2 ring-base-100"
            ></span>
          </div>
          <div tabindex="0" class="dropdown-content card card-compact bg-base-100 rounded-box z-50 w-72 p-3 shadow-xl border border-base-300 mt-2">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs uppercase tracking-wider text-base-content/85">Notificaciones Push PWA</span>
                <span
                  class="badge badge-xs font-bold"
                  :class="isSubscribed ? 'badge-success' : 'badge-ghost'"
                >
                  {{ isSubscribed ? 'Activadas' : 'Inactivas' }}
                </span>
              </div>
              <p class="text-xs text-base-content/85">
                Recibe avisos en tu móvil cuando te toque café, el café esté listo o te pidan un cambio de turno.
              </p>
              <div class="pt-1 flex flex-col gap-1.5">
                <button
                  v-if="!isSubscribed"
                  type="button"
                  class="btn btn-primary btn-sm w-full gap-1.5"
                  :disabled="pushLoading"
                  @click="handleEnablePush"
                >
                  <span v-if="pushLoading" class="loading loading-spinner loading-xs"></span>
                  <span>📲 Activar en este teléfono</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline btn-sm w-full gap-1.5"
                  :disabled="pushLoading"
                  @click="handleDisablePush"
                >
                  <span>🔕 Desactivar en este dispositivo</span>
                </button>
                <button
                  v-if="isSubscribed"
                  type="button"
                  class="btn btn-ghost btn-xs w-full text-secondary"
                  @click="handleTestPush"
                >
                  ⚡ Enviar notificación de prueba
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dark / Light Theme Toggle -->
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-circle"
          :title="theme === 'coffee' ? 'Cambiar a tema claro' : 'Cambiar a tema café oscuro'"
          @click="toggleTheme"
        >
          <span v-if="theme === 'coffee'" class="text-lg">☀️</span>
          <span v-else class="text-lg">🌙</span>
        </button>

        <div v-if="currentUser" class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2 border border-base-300">
            <UserAvatar :name="currentUser.display_name" :size="28" :variant="currentUser.avatar_variant || 'beam'" :colors="currentUser.avatar_palette" />
            <span class="hidden sm:inline font-semibold text-xs">{{ currentUser.display_name }}</span>
            <span
              class="badge badge-xs"
              :class="currentUser.role === 'admin' ? 'badge-warning' : 'badge-ghost'"
            >
              {{ currentUser.role === 'admin' ? 'Admin' : 'Usuario' }}
            </span>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-xl border border-base-300 mt-2">
            <li class="menu-title px-3 py-1 text-xs">
              <span>Conectado como @{{ currentUser.username }}</span>
            </li>
            <li>
              <button type="button" @click="openAvatarModal">🎨 Personalizar mi Avatar</button>
            </li>
            <li>
              <button type="button" @click="openPinModal">🔑 Cambiar mi PIN</button>
            </li>
            <li>
              <button type="button" class="text-error" @click="handleLogout">🚪 Cerrar sesión</button>
            </li>
          </ul>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Tabs -->
    <div class="lg:hidden bg-base-100 border-b border-base-300 px-3 py-2 overflow-x-auto">
      <div class="flex gap-1.5 min-w-max bg-base-200/80 p-1 rounded-full border border-base-300 shadow-inner">
        <button
          class="btn btn-xs rounded-full px-3 transition-all font-medium"
          :class="activeTab === 'schedule' ? 'btn-primary shadow-xs' : 'btn-ghost'"
          @click="activeTab = 'schedule'"
        >
          📅 Calendario
        </button>
        <button
          class="btn btn-xs rounded-full px-3 transition-all font-medium"
          :class="activeTab === 'swaps' ? 'btn-primary shadow-xs' : 'btn-ghost'"
          @click="activeTab = 'swaps'"
        >
          🔄 Intercambios
          <span v-if="actionableSwapsCount > 0" class="badge badge-warning badge-xs">
            {{ actionableSwapsCount }}
          </span>
        </button>
        <button
          class="btn btn-xs rounded-full px-3 transition-all font-medium"
          :class="activeTab === 'equity' ? 'btn-primary shadow-xs' : 'btn-ghost'"
          @click="activeTab = 'equity'"
        >
          ⚖️ Equidad
        </button>
        <button
          class="btn btn-xs rounded-full px-3 transition-all font-medium"
          :class="activeTab === 'users' ? 'btn-primary shadow-xs' : 'btn-ghost'"
          @click="activeTab = 'users'"
        >
          👥 Usuarios
        </button>
      </div>
    </div>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
      <!-- Global Notification Banner if user has pending cover requests -->
      <div
        v-if="myIncomingPendingSwaps.length > 0 && activeTab !== 'swaps'"
        class="alert alert-warning shadow-md"
      >
        <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-xl">🔔</span>
            <span>
              Tienes <strong>{{ myIncomingPendingSwaps.length }}</strong> solicitud(es) de compañero(s) pidiendo cubrir o intercambiar un turno de café.
            </span>
          </div>
          <button class="btn btn-sm btn-neutral" @click="activeTab = 'swaps'">
            Ver y Responder Solicitudes
          </button>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div v-if="feedbackMsg" class="alert shadow-md" :class="feedbackType === 'error' ? 'alert-error' : 'alert-success'">
        <span>{{ feedbackMsg }}</span>
        <button class="btn btn-xs btn-ghost" @click="feedbackMsg = ''">✕</button>
      </div>

      <!-- ===================================================== -->
      <!-- TAB 1: CALENDARIO SEMANAL DE CAFÉ                     -->
      <!-- ===================================================== -->
      <section v-if="activeTab === 'schedule'" class="space-y-6">
        <!-- Week Selector & Admin Actions Bar -->
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold">
                  Semana del {{ formatDateShort(weekData?.selectedWeekMonday) }} al {{ formatDateShort(weekData?.selectedWeekFriday) }}
                </h2>
                <span
                  v-if="weekData?.selectedWeekMonday === weekData?.currentWeekMonday"
                  class="badge badge-primary badge-sm"
                >
                  Semana Actual
                </span>
                <span
                  v-else-if="weekData?.selectedWeekMonday === weekData?.nextWeekMonday"
                  class="badge badge-secondary badge-sm"
                >
                  Próxima Semana
                </span>
              </div>
              <p class="text-xs text-base-content/85">
                Turnos hábiles de Lunes a Viernes y turnos extraordinarios de fines de semana. Se compensan de forma equitativa.
              </p>
            </div>

            <!-- Week Navigation & Extra Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="join">
                <button
                  type="button"
                  class="btn btn-sm join-item"
                  :class="weekData?.selectedWeekMonday === weekData?.currentWeekMonday ? 'btn-primary' : 'btn-outline border-base-300'"
                  @click="selectWeek(weekData?.currentWeekMonday)"
                >
                  Semana Actual
                </button>
                <button
                  type="button"
                  class="btn btn-sm join-item"
                  :class="weekData?.selectedWeekMonday === weekData?.nextWeekMonday ? 'btn-primary' : 'btn-outline border-base-300'"
                  @click="selectWeek(weekData?.nextWeekMonday)"
                >
                  Próxima Semana
                </button>
              </div>

              <!-- Historical / Generated Weeks Dropdown -->
              <select
                v-if="weekData?.allWeeks?.length"
                class="select select-bordered select-sm"
                :value="weekData?.selectedWeekMonday"
                @change="onSelectWeekDropdown($event)"
              >
                <option
                  v-if="!weekData.allWeeks.some((w: any) => w.week_start === weekData.currentWeekMonday)"
                  :value="weekData.currentWeekMonday"
                >
                  {{ weekData.currentWeekMonday }} (Actual - Sin generar)
                </option>
                <option
                  v-if="!weekData.allWeeks.some((w: any) => w.week_start === weekData.nextWeekMonday)"
                  :value="weekData.nextWeekMonday"
                >
                  {{ weekData.nextWeekMonday }} (Próxima - Sin generar)
                </option>
                <option
                  v-for="w in weekData.allWeeks"
                  :key="w.id"
                  :value="w.week_start"
                >
                  Semana {{ w.week_start }} al {{ w.week_end }}
                </option>
              </select>

              <!-- Extraordinary Shift Button (Admin) -->
              <button
                v-if="isAdmin"
                type="button"
                class="btn btn-sm btn-outline btn-secondary gap-1"
                @click="openExtraordinaryModal"
              >
                <span>➕ Turno Extraordinario</span>
              </button>

              <!-- Admin On-Demand Generation Buttons -->
              <template v-if="isAdmin">
                <button
                  v-if="!weekData?.week"
                  type="button"
                  class="btn btn-sm btn-accent gap-1"
                  :disabled="generatingWeek"
                  @click="handleGenerateWeek(false)"
                >
                  <span v-if="generatingWeek" class="loading loading-spinner loading-xs"></span>
                  <span>⚡ Generar Esta Semana</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-sm btn-outline btn-warning gap-1"
                  :disabled="generatingWeek"
                  @click="handleGenerateWeek(true)"
                >
                  <span v-if="generatingWeek" class="loading loading-spinner loading-xs"></span>
                  <span>🔄 Regenerar Semana</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Empty State if Week Not Yet Generated -->
        <div
          v-if="!weekData?.week && regularShifts.length === 0"
          class="card bg-base-100 border-2 border-dashed border-base-300 p-8 text-center"
        >
          <div class="max-w-md mx-auto space-y-4">
            <div class="text-5xl">☕</div>
            <h3 class="text-xl font-bold">
              Esta semana aún no ha sido generada
            </h3>
            <p class="text-sm text-base-content/85">
              Los turnos semanales regulares (Lunes a Viernes) se generan bajo demanda del Administrador tomando en cuenta el historial y coberturas previas.
            </p>
            <div v-if="isAdmin" class="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                class="btn btn-primary gap-2"
                :disabled="generatingWeek"
                @click="handleGenerateWeek(false)"
              >
                <span v-if="generatingWeek" class="loading loading-spinner loading-sm"></span>
                <span>⚡ Generar Turnos del {{ formatDateShort(weekData?.selectedWeekMonday) }} al {{ formatDateShort(weekData?.selectedWeekFriday) }}</span>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-outline gap-1"
                @click="openExtraordinaryModal"
              >
                <span>➕ Asignar Turno Extraordinario</span>
              </button>
            </div>
            <div v-else class="badge badge-ghost p-3">
              Solicita a un Administrador que genere la programación de esta semana.
            </div>
          </div>
        </div>

        <!-- 5-Day Regular Workweek Grid (Lunes a Viernes) -->
        <div v-if="regularShifts.length > 0" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div
            v-for="shift in regularShifts"
            :key="shift.id"
            class="card bg-base-100 shadow-sm border transition-all flex flex-col justify-between"
            :class="[
              shift.assigned_user_id === currentUser?.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-base-300',
              shift.status === 'skipped' ? 'opacity-75 bg-base-300/60' : ''
            ]"
          >
            <div class="card-body p-4 space-y-3">
              <!-- Day Header -->
              <div class="flex items-center justify-between border-b border-base-200 pb-2">
                <div>
                  <span class="font-extrabold text-base block">{{ shift.day_name }}</span>
                  <span class="text-xs text-base-content/85 font-medium">{{ formatDateHuman(shift.shift_date) }}</span>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span
                    v-if="isToday(shift.shift_date)"
                    class="badge badge-primary badge-xs font-bold"
                  >
                    HOY
                  </span>
                  <span
                    v-if="shift.status === 'completed'"
                    class="badge badge-success badge-sm gap-1"
                  >
                    ✓ Listo
                  </span>
                  <span
                    v-else-if="shift.status === 'skipped'"
                    class="badge badge-neutral badge-sm"
                  >
                    No laborable
                  </span>
                  <span
                    v-else
                    class="badge badge-ghost badge-sm"
                  >
                    Pendiente
                  </span>
                </div>
              </div>

              <!-- Assigned Person -->
              <div class="py-2 flex items-center gap-3">
                <UserAvatar :name="shift.assigned_user_name" :size="48" :variant="shift.assigned_user_variant || 'beam'" :colors="shift.assigned_user_palette" />
                <div class="min-w-0 flex-1">
                  <div class="text-xs text-base-content/80 font-medium">Encargado del café:</div>
                  <div class="font-bold text-base truncate" :title="shift.assigned_user_name">
                    {{ shift.assigned_user_name }}
                  </div>
                  <div class="flex flex-wrap items-center gap-1 mt-0.5">
                    <span class="text-xs text-base-content/85">@{{ shift.assigned_username }}</span>
                    <span
                      v-if="shift.assigned_user_role === 'admin'"
                      class="badge badge-warning badge-xs"
                    >
                      Admin
                    </span>
                    <span
                      v-if="shift.assigned_user_id === currentUser?.id"
                      class="badge badge-primary badge-outline badge-xs"
                    >
                      Tú
                    </span>
                  </div>
                </div>
              </div>

              <!-- Cover / Compensation Notice if covered -->
              <div
                v-if="shift.was_covered"
                class="bg-info/15 border border-info/40 text-base-content rounded-lg p-2.5 text-xs space-y-1"
              >
                <div class="font-bold text-info flex items-center gap-1">
                  <span>🤝 Turno cubierto</span>
                </div>
                <p class="text-base-content/90">
                  Originalmente de <strong class="text-base-content">{{ shift.original_user_name }}</strong>. El conteo se compensa en las siguientes semanas.
                </p>
              </div>

              <!-- Pending Swap Banner on this Shift -->
              <div
                v-if="getPendingSwapForShift(shift.id)"
                class="bg-warning/15 border border-warning/40 text-base-content rounded-lg p-2.5 text-xs space-y-0.5"
              >
                <div class="font-bold text-warning">⏳ Solicitud pendiente</div>
                <div class="text-base-content/90">
                  Esperando respuesta de <strong class="text-base-content">{{ getPendingSwapForShift(shift.id)?.target_name }}</strong>
                </div>
              </div>

              <!-- Notes if any -->
              <div v-if="shift.notes" class="text-xs italic text-base-content/90 bg-base-200 border border-base-300 p-2 rounded">
                "{{ shift.notes }}"
              </div>
            </div>

            <!-- Card Footer Actions -->
            <div class="p-3 pt-0 space-y-1.5">
              <!-- Complete / Uncomplete Button (Owner or Admin) -->
              <button
                v-if="(shift.assigned_user_id === currentUser?.id || isAdmin) && shift.status !== 'skipped'"
                type="button"
                class="btn btn-xs w-full"
                :class="shift.status === 'completed' ? 'btn-outline btn-success' : 'btn-success'"
                @click="toggleShiftCompleted(shift)"
              >
                <span v-if="shift.status === 'completed'">✓ Café Realizado (Desmarcar)</span>
                <span v-else>☕ Marcar Café Listo</span>
              </button>

              <!-- Request Cover / Swap Button (Owner or Admin) -->
              <button
                v-if="(shift.assigned_user_id === currentUser?.id || isAdmin) && shift.status === 'pending'"
                type="button"
                class="btn btn-xs btn-outline w-full gap-1"
                @click="openSwapModal(shift)"
              >
                <span>🔄</span>
                <span>{{ isAdmin && shift.assigned_user_id !== currentUser?.id ? 'Reasignar / Cubrir' : 'Pedir que me cubran / Cambiar' }}</span>
              </button>

              <!-- Admin Holiday / Skip Toggle -->
              <button
                v-if="isAdmin"
                type="button"
                class="btn btn-xs btn-ghost w-full opacity-70 hover:opacity-100"
                @click="toggleShiftSkipped(shift)"
              >
                <span v-if="shift.status === 'skipped'">↩️ Reactivar día hábil</span>
                <span v-else>🏖️ Marcar feriado / sin café</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Extraordinary Shifts Section (Fin de semana / Fuera de días hábiles) -->
        <div v-if="extraordinaryShifts.length > 0" class="card bg-base-100 shadow-sm border border-secondary/40">
          <div class="card-body p-4 sm:p-6 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base-200 pb-3">
              <div>
                <h3 class="font-bold text-lg flex items-center gap-2">
                  <span>✨ Turnos Extraordinarios (Fines de Semana / Especiales)</span>
                  <span class="badge badge-secondary badge-sm">{{ extraordinaryShifts.length }}</span>
                </h3>
                <p class="text-xs text-base-content/85">
                  Turnos asignados fuera de días hábiles regulares. Suman al conteo de café del integrante y el sistema lo compensa automáticamente en las siguientes asignaciones.
                </p>
              </div>
              <button
                v-if="isAdmin"
                type="button"
                class="btn btn-xs btn-outline btn-secondary"
                @click="openExtraordinaryModal"
              >
                ➕ Agregar otro turno
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div
                v-for="shift in extraordinaryShifts"
                :key="shift.id"
                class="border border-base-300 rounded-xl p-4 bg-base-200/40 flex flex-col justify-between gap-3"
                :class="shift.assigned_user_id === currentUser?.id ? 'ring-2 ring-secondary/30' : ''"
              >
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="badge badge-secondary badge-sm">{{ shift.day_name }}</span>
                      <span class="text-xs font-semibold ml-2">{{ formatDateHuman(shift.shift_date) }}</span>
                    </div>
                    <span
                      v-if="shift.status === 'completed'"
                      class="badge badge-success badge-xs font-bold"
                    >
                      ✓ Café Listo
                    </span>
                    <span v-else class="badge badge-ghost badge-xs">Pendiente</span>
                  </div>

                  <div class="flex items-center gap-3 py-1">
                    <UserAvatar :name="shift.assigned_user_name" :size="42" :variant="shift.assigned_user_variant || 'beam'" :colors="shift.assigned_user_palette" />
                    <div>
                      <div class="font-bold text-sm">{{ shift.assigned_user_name }}</div>
                      <div class="text-xs text-base-content/85">
                        @{{ shift.assigned_username }}
                        <span v-if="shift.assigned_user_id === currentUser?.id" class="badge badge-xs badge-outline">Tú</span>
                      </div>
                    </div>
                  </div>

                  <p v-if="shift.notes" class="text-xs italic bg-base-100 p-2 rounded border border-base-300 text-base-content/95">
                    "{{ shift.notes }}"
                  </p>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-base-300">
                  <button
                    v-if="shift.assigned_user_id === currentUser?.id || isAdmin"
                    type="button"
                    class="btn btn-xs flex-1"
                    :class="shift.status === 'completed' ? 'btn-outline btn-success' : 'btn-success'"
                    @click="toggleShiftCompleted(shift)"
                  >
                    <span v-if="shift.status === 'completed'">✓ Listo (Desmarcar)</span>
                    <span v-else>☕ Marcar Café Listo</span>
                  </button>

                  <button
                    v-if="isAdmin"
                    type="button"
                    class="btn btn-xs btn-ghost text-error"
                    title="Eliminar turno extraordinario"
                    @click="deleteExtraordinaryShift(shift)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================== -->
      <!-- TAB 2: INTERCAMBIOS Y COBERTURAS DE TURNOS            -->
      <!-- ===================================================== -->
      <section v-if="activeTab === 'swaps'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 class="text-2xl font-bold">Intercambios y Coberturas de Turno</h2>
            <p class="text-sm text-base-content/85">
              Un cambio de turno se aplica cuando ambas partes están de acuerdo (el compañero acepta cubrir/intercambiar) o cuando lo aprueba un Administrador.
            </p>
          </div>
        </div>

        <!-- Incoming Requests Waiting for Current User or Admin -->
        <div v-if="pendingSwaps.length > 0" class="card bg-base-100 shadow-sm border border-warning">
          <div class="card-body p-4 sm:p-6 space-y-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <span>⏳ Solicitudes Pendientes de Aprobación</span>
              <span class="badge badge-warning">{{ pendingSwaps.length }}</span>
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="req in pendingSwaps"
                :key="req.id"
                class="border border-base-300 rounded-xl p-4 bg-base-200/50 flex flex-col justify-between gap-3"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="badge badge-sm" :class="req.type === 'cover' ? 'badge-info' : 'badge-secondary'">
                      {{ req.type === 'cover' ? '🤝 Cubrir Turno (Con compensación)' : '🔄 Trueque de Días' }}
                    </span>
                    <span class="text-xs text-base-content/75">{{ formatDateShort(req.created_at.slice(0, 10)) }}</span>
                  </div>

                  <p class="text-sm">
                    <strong>{{ req.requester_name }}</strong> solicita que
                    <strong>{{ req.target_name }}</strong>
                    <template v-if="req.type === 'cover'">
                      cubra su turno del <strong>{{ req.day_name }} {{ formatDateHuman(req.shift_date) }}</strong>.
                    </template>
                    <template v-else>
                      intercambie el turno del <strong>{{ req.day_name }} {{ formatDateHuman(req.shift_date) }}</strong>
                      por el del <strong>{{ req.target_day_name }} {{ formatDateHuman(req.target_shift_date) }}</strong>.
                    </template>
                  </p>

                  <p v-if="req.reason" class="text-xs italic bg-base-100 p-2 rounded border border-base-300 text-base-content">
                    Motivo: "{{ req.reason }}"
                  </p>

                  <p v-if="req.type === 'cover'" class="text-xs text-base-content/85">
                    ⚖️ Al aceptar, <strong>{{ req.target_name }}</strong> sumará +1 turno realizado y <strong>{{ req.requester_name }}</strong> compensará este turno en las siguientes semanas.
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-base-300">
                  <!-- Target User Agreement Buttons -->
                  <button
                    v-if="req.target_user_id === currentUser?.id"
                    type="button"
                    class="btn btn-sm btn-success flex-1"
                    @click="respondSwap(req.id, 'accept')"
                  >
                    ✅ Aceptar y Cubrir Turno
                  </button>
                  <button
                    v-if="req.target_user_id === currentUser?.id"
                    type="button"
                    class="btn btn-sm btn-outline btn-error"
                    @click="respondSwap(req.id, 'reject')"
                  >
                    ✕ Rechazar
                  </button>

                  <!-- Admin Override Approval -->
                  <button
                    v-if="isAdmin && req.target_user_id !== currentUser?.id"
                    type="button"
                    class="btn btn-sm btn-warning"
                    @click="respondSwap(req.id, 'accept')"
                  >
                    ⚡ Aprobar como Admin
                  </button>
                  <button
                    v-if="isAdmin && req.target_user_id !== currentUser?.id"
                    type="button"
                    class="btn btn-sm btn-outline btn-error"
                    @click="respondSwap(req.id, 'reject')"
                  >
                    Rechazar (Admin)
                  </button>

                  <!-- Requester Cancel Button -->
                  <button
                    v-if="req.requester_user_id === currentUser?.id"
                    type="button"
                    class="btn btn-sm btn-ghost text-error ml-auto"
                    @click="respondSwap(req.id, 'cancel')"
                  >
                    Cancelar mi solicitud
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- History of All Swap / Cover Requests -->
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4 sm:p-6">
            <h3 class="font-bold text-lg mb-3">Historial de Intercambios y Coberturas</h3>

            <div v-if="!swapsList.length" class="text-center py-8 text-base-content/75 text-sm">
              Aún no se han registrado solicitudes de cobertura o intercambio de turnos.
            </div>

            <div v-else class="overflow-x-auto">
              <table class="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Fecha Turno</th>
                    <th>Modalidad</th>
                    <th>Solicitante</th>
                    <th>Compañero que cubre</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in swapsList" :key="s.id">
                    <td class="font-medium">
                      {{ s.day_name }} {{ formatDateShort(s.shift_date) }}
                      <div v-if="s.type === 'swap' && s.target_shift_date" class="text-xs text-base-content/80 font-medium">
                        ⇄ {{ s.target_day_name }} {{ formatDateShort(s.target_shift_date) }}
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-xs" :class="s.type === 'cover' ? 'badge-info' : 'badge-secondary'">
                        {{ s.type === 'cover' ? 'Cobertura (+Compensación)' : 'Trueque de día' }}
                      </span>
                    </td>
                    <td>{{ s.requester_name }}</td>
                    <td>{{ s.target_name }}</td>
                    <td class="max-w-xs truncate text-xs text-base-content/90">{{ s.reason || '—' }}</td>
                    <td>
                      <span v-if="s.status === 'pending'" class="badge badge-warning badge-sm">Pendiente</span>
                      <span v-else-if="s.status === 'accepted'" class="badge badge-success badge-sm">
                        Aceptado por ambos
                      </span>
                      <span v-else-if="s.status === 'admin_forced'" class="badge badge-accent badge-sm">
                        Aplicado por Admin ({{ s.resolved_by_name }})
                      </span>
                      <span v-else-if="s.status === 'rejected'" class="badge badge-error badge-sm">Rechazado</span>
                      <span v-else class="badge badge-ghost badge-sm">Cancelado</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================== -->
      <!-- TAB 3: EQUIDAD Y COMPENSACIÓN                         -->
      <!-- ===================================================== -->
      <section v-if="activeTab === 'equity'" class="space-y-6">
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4 sm:p-6 space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold">Balance de Equidad y Compensación Semanal</h2>
                <p class="text-sm text-base-content/85">
                  Tanto los usuarios como los administradores participan en la lista de café. Cuando alguien cubre el turno de otro compañero o realiza un turno extraordinario de fin de semana, su conteo efectivo sube (+1), compensándose automáticamente al generar las siguientes semanas.
                </p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>Integrante</th>
                    <th>Rol</th>
                    <th>En Rotación</th>
                    <th class="text-center">Turnos Originales</th>
                    <th class="text-center">Cubrió a otros (+)</th>
                    <th class="text-center">Fue cubierto (-)</th>
                    <th class="text-center">Total Turnos Reales</th>
                    <th class="text-center">Carga Efectiva</th>
                    <th>Estado para Próxima Semana</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in weekData?.equityStats || []" :key="stat.id">
                    <td class="font-bold">
                      <div class="flex items-center gap-2.5">
                        <UserAvatar :name="stat.display_name" :size="32" :variant="stat.avatar_variant || 'beam'" :colors="stat.avatar_palette" />
                        <div>
                          <span>{{ stat.display_name }}</span>
                          <span class="text-xs font-normal opacity-60 block">@{{ stat.username }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-sm" :class="stat.role === 'admin' ? 'badge-warning' : 'badge-ghost'">
                        {{ stat.role === 'admin' ? 'Admin' : 'Usuario' }}
                      </span>
                    </td>
                    <td>
                      <span v-if="stat.participates_in_coffee" class="badge badge-success badge-sm gap-1">
                        ☕ Activo
                      </span>
                      <span v-else class="badge badge-neutral badge-sm">
                        Pausado
                      </span>
                    </td>
                    <td class="text-center font-mono">{{ stat.original_shifts_count }}</td>
                    <td class="text-center font-mono text-success font-bold">
                      +{{ stat.covers_given }}
                    </td>
                    <td class="text-center font-mono text-warning font-bold">
                      -{{ stat.covers_received }}
                    </td>
                    <td class="text-center font-mono font-bold">
                      {{ stat.assigned_shifts_count }}
                    </td>
                    <td class="text-center">
                      <span class="badge badge-primary font-mono font-bold">
                        {{ stat.effective_load }}
                      </span>
                    </td>
                    <td>
                      <span
                        v-if="!stat.participates_in_coffee"
                        class="text-xs text-base-content/75"
                      >
                        No participa actualmente
                      </span>
                      <span
                        v-else-if="stat.effective_load < minActiveLoad"
                        class="badge badge-warning badge-sm"
                      >
                        Prioridad alta (debe compensar)
                      </span>
                      <span
                        v-else-if="stat.effective_load > minActiveLoad"
                        class="badge badge-info badge-sm"
                      >
                        A favor (+{{ stat.effective_load - minActiveLoad }} turno adelantado)
                      </span>
                      <span v-else class="badge badge-success badge-outline badge-sm">
                        Al día / Equilibrado
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================== -->
      <!-- TAB 4: MÓDULO DE USUARIOS Y PERMISOS                  -->
      <!-- ===================================================== -->
      <section v-if="activeTab === 'users'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Create User Card (Admin Only) -->
          <div class="lg:col-span-1">
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body p-5">
                <h3 class="card-title text-lg">
                  {{ isAdmin ? '➕ Crear Nuevo Usuario' : '🔒 Permisos de Usuarios' }}
                </h3>
                <p v-if="!isAdmin" class="text-sm text-base-content/85">
                  Solo los usuarios con rol <strong>Admin</strong> pueden crear nuevos integrantes o modificar permisos.
                </p>

                <form v-else @submit.prevent="handleCreateUser" class="space-y-3 mt-2">
                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">Nombre Visible</span>
                    </label>
                    <input
                      v-model="newUserForm.display_name"
                      type="text"
                      placeholder="ej. Laura Gómez"
                      class="input input-bordered input-sm w-full"
                      required
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">Usuario (para iniciar sesión)</span>
                    </label>
                    <input
                      v-model="newUserForm.username"
                      type="text"
                      placeholder="ej. laura"
                      class="input input-bordered input-sm w-full"
                      required
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label py-1">
                        <span class="label-text text-xs font-semibold">PIN Inicial</span>
                      </label>
                      <input
                        v-model="newUserForm.pin"
                        type="text"
                        placeholder="1234"
                        class="input input-bordered input-sm w-full"
                        required
                      />
                    </div>

                    <div class="form-control">
                      <label class="label py-1">
                        <span class="label-text text-xs font-semibold">Rol / Permiso</span>
                      </label>
                      <select v-model="newUserForm.role" class="select select-bordered select-sm w-full">
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-control pt-1">
                    <label class="label cursor-pointer justify-start gap-3">
                      <input
                        v-model="newUserForm.participates_in_coffee"
                        type="checkbox"
                        class="toggle toggle-primary toggle-sm"
                      />
                      <span class="label-text text-xs">
                        Incluir en la lista semanal de hacer café
                      </span>
                    </label>
                  </div>

                  <button type="submit" class="btn btn-primary btn-sm w-full mt-2" :disabled="savingUser">
                    <span v-if="savingUser" class="loading loading-spinner loading-xs"></span>
                    <span>Crear Integrante</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          <!-- Users List & Permissions Management -->
          <div class="lg:col-span-2">
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body p-5">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h3 class="font-bold text-lg">Integrantes del Equipo ({{ (weekData?.equityStats || []).length }})</h3>
                    <p class="text-xs text-base-content/80">
                      El Administrador también forma parte de la rotación de café por defecto.
                    </p>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Nombre / Usuario</th>
                        <th>Permiso (Rol)</th>
                        <th>Participa en Café</th>
                        <th v-if="isAdmin" class="text-right">Acciones Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="u in weekData?.equityStats || []" :key="u.id">
                        <td>
                          <div class="flex items-center gap-2.5">
                            <UserAvatar :name="u.display_name" :size="32" :variant="u.avatar_variant || 'beam'" :colors="u.avatar_palette" />
                            <div>
                              <div class="font-bold">{{ u.display_name }}</div>
                              <div class="text-xs opacity-60">@{{ u.username }}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            v-if="isAdmin"
                            class="select select-bordered select-xs"
                            :value="u.role"
                            @change="updateUserRole(u, ($event.target as HTMLSelectElement).value)"
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Admin</option>
                          </select>
                          <span v-else class="badge badge-sm" :class="u.role === 'admin' ? 'badge-warning' : 'badge-ghost'">
                            {{ u.role === 'admin' ? 'Admin' : 'Usuario' }}
                          </span>
                        </td>
                        <td>
                          <input
                            v-if="isAdmin"
                            type="checkbox"
                            class="toggle toggle-success toggle-sm"
                            :checked="u.participates_in_coffee"
                            @change="toggleUserCoffeeParticipation(u)"
                          />
                          <span v-else class="badge badge-xs" :class="u.participates_in_coffee ? 'badge-success' : 'badge-ghost'">
                            {{ u.participates_in_coffee ? 'Sí' : 'No' }}
                          </span>
                        </td>
                        <td v-if="isAdmin" class="text-right space-x-1">
                          <button
                            type="button"
                            class="btn btn-xs btn-ghost"
                            title="Resetear PIN"
                            @click="openResetUserPinModal(u)"
                          >
                            🔑 PIN
                          </button>
                          <button
                            v-if="u.id !== currentUser?.id && u.original_shifts_count === 0 && u.assigned_shifts_count === 0"
                            type="button"
                            class="btn btn-xs btn-ghost text-error"
                            title="Eliminar usuario"
                            @click="deleteUser(u)"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MÓDULO DE RECORDATORIOS AUTOMÁTICOS DE CAFÉ (ADMIN) -->
        <div v-if="isAdmin" class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-5 sm:p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base-200 pb-3">
              <div>
                <h3 class="font-bold text-lg flex flex-wrap items-center gap-2">
                  <span>⏰ Notificaciones Automáticas para el Encargado del Café</span>
                  <span class="badge badge-sm" :class="reminderSettings.config.reminder_enabled ? 'badge-success' : 'badge-ghost'">
                    {{ reminderSettings.config.reminder_enabled ? 'Activado' : 'Desactivado' }}
                  </span>
                  <span class="badge badge-sm badge-outline gap-1 font-mono text-[11px]">
                    📍 America/Caracas (UTC-4)
                  </span>
                </h3>
                <p class="text-xs text-base-content/85">
                  Configura el aviso push automático para notificar al teléfono de quien le toque hacer el café en su día asignado con horario de Caracas.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
              <!-- Formulario de Configuración -->
              <div class="lg:col-span-2 space-y-4">
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-3 py-1">
                    <input
                      v-model="reminderSettings.config.reminder_enabled"
                      type="checkbox"
                      class="toggle toggle-primary toggle-sm"
                    />
                    <span class="label-text text-sm font-semibold">
                      Habilitar recordatorio automático del día al encargado
                    </span>
                  </label>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">Hora de la notificación (Mismo día - Caracas)</span>
                    </label>
                    <input
                      v-model="reminderSettings.config.reminder_time"
                      type="time"
                      class="input input-bordered input-sm w-full"
                    />
                    <span class="text-[10px] text-base-content/70 mt-1">Hora local de Venezuela (VET, UTC-4)</span>
                  </div>

                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">Título del aviso</span>
                    </label>
                    <input
                      v-model="reminderSettings.config.reminder_title"
                      type="text"
                      class="input input-bordered input-sm w-full"
                      placeholder="☕ ¡Hoy te toca hacer el café!"
                    />
                  </div>
                </div>

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">
                      Mensaje de la notificación (usa <code class="text-primary">{nombre}</code> para el nombre del encargado)
                    </span>
                  </label>
                  <textarea
                    v-model="reminderSettings.config.reminder_message"
                    class="textarea textarea-bordered textarea-sm w-full h-20"
                    placeholder="Hola {nombre}, hoy es tu turno de preparar el café para el equipo."
                  ></textarea>
                </div>

                <div class="border-t border-base-200 pt-3">
                  <div class="form-control">
                    <label class="label cursor-pointer justify-start gap-3 py-1">
                      <input
                        v-model="reminderSettings.config.notify_day_before"
                        type="checkbox"
                        class="toggle toggle-secondary toggle-sm"
                      />
                      <span class="label-text text-xs font-semibold">
                        Avisar también la tarde anterior (recordatorio previo)
                      </span>
                    </label>
                  </div>

                  <div v-if="reminderSettings.config.notify_day_before" class="form-control mt-2 max-w-xs">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">Hora del aviso previo (Día anterior - Caracas)</span>
                    </label>
                    <input
                      v-model="reminderSettings.config.day_before_time"
                      type="time"
                      class="input input-bordered input-sm"
                    />
                    <span class="text-[10px] text-base-content/70 mt-1">Hora local de Venezuela (VET, UTC-4)</span>
                  </div>
                </div>

                <div class="pt-2">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    :disabled="savingReminders"
                    @click="handleSaveReminderSettings"
                  >
                    <span v-if="savingReminders" class="loading loading-spinner loading-xs"></span>
                    <span>💾 Guardar Configuración</span>
                  </button>
                </div>
              </div>

              <!-- Enviar Aviso Manual / Inmediato -->
              <div class="lg:col-span-1 space-y-4">
                <div class="border border-base-300 rounded-2xl p-4 bg-base-200/50 space-y-3">
                  <h4 class="font-bold text-sm flex items-center justify-between">
                    <span>☕ Encargado de Hoy</span>
                    <span
                      v-if="reminderSettings.today"
                      class="badge badge-xs"
                      :class="reminderSettings.today.status === 'completed' ? 'badge-success' : 'badge-warning'"
                    >
                      {{ reminderSettings.today.status === 'completed' ? 'Listo' : 'Pendiente' }}
                    </span>
                  </h4>

                  <div v-if="reminderSettings.today" class="space-y-2">
                    <div class="flex items-center gap-2">
                      <UserAvatar :name="reminderSettings.today.display_name" :size="32" :variant="reminderSettings.today.avatar_variant || 'beam'" :colors="reminderSettings.today.avatar_palette" />
                      <div>
                        <div class="font-bold text-sm">{{ reminderSettings.today.display_name }}</div>
                        <div class="text-xs text-base-content/80">@{{ reminderSettings.today.username }}</div>
                      </div>
                    </div>

                    <div class="text-xs text-base-content/85">
                      Dispositivos con push: <strong>{{ reminderSettings.today.push_devices }}</strong>
                    </div>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline btn-warning w-full gap-1.5"
                      :disabled="sendingReminderNow"
                      @click="handleSendReminderNow('today')"
                    >
                      <span>🔔</span>
                      <span>Notificar a {{ reminderSettings.today.display_name.split(' ')[0] }} Ahora</span>
                    </button>
                  </div>
                  <div v-else class="text-xs text-base-content/75 italic">
                    No hay turno asignado para el día de hoy.
                  </div>
                </div>

                <!-- Encargado de Mañana -->
                <div class="border border-base-300 rounded-2xl p-4 bg-base-200/50 space-y-3">
                  <h4 class="font-bold text-sm">☕ Encargado de Mañana</h4>
                  <div v-if="reminderSettings.tomorrow" class="space-y-2">
                    <div class="flex items-center gap-2">
                      <UserAvatar :name="reminderSettings.tomorrow.display_name" :size="32" :variant="reminderSettings.tomorrow.avatar_variant || 'beam'" :colors="reminderSettings.tomorrow.avatar_palette" />
                      <div>
                        <div class="font-bold text-sm">{{ reminderSettings.tomorrow.display_name }}</div>
                        <div class="text-xs text-base-content/80">@{{ reminderSettings.tomorrow.username }}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline btn-secondary w-full gap-1.5"
                      :disabled="sendingReminderNow"
                      @click="handleSendReminderNow('tomorrow')"
                    >
                      <span>🔔</span>
                      <span>Enviar Recordatorio Previo</span>
                    </button>
                  </div>
                  <div v-else class="text-xs text-base-content/75 italic">
                    No hay turno asignado para el día de mañana.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ===================================================== -->
    <!-- MODAL: ASIGNAR TURNO EXTRAORDINARIO (FIN DE SEMANA)   -->
    <!-- ===================================================== -->
    <dialog class="modal" :class="{ 'modal-open': extraModal.open }">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span>✨ Asignar Turno Extraordinario de Café</span>
        </h3>
        <p class="text-xs text-base-content/85 mt-1">
          Asigna manualmente un turno fuera de días hábiles (Sábado, Domingo o evento especial). Se suma a la carga del integrante para compensarse equitativamente.
        </p>

        <form @submit.prevent="submitExtraordinaryShift" class="space-y-4 mt-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-semibold text-xs">Fecha del turno extraordinario</span>
            </label>
            <input
              v-model="extraModal.shift_date"
              type="date"
              class="input input-bordered input-sm w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-semibold text-xs">Encargado del café</span>
            </label>
            <select v-model="extraModal.assigned_user_id" class="select select-bordered select-sm w-full" required>
              <option :value="0" disabled>-- Elige un integrante --</option>
              <option
                v-for="u in activeTeammates"
                :key="u.id"
                :value="u.id"
              >
                {{ u.display_name }} (@{{ u.username }}) {{ u.role === 'admin' ? '[Admin]' : '' }} — Carga: {{ u.effective_load }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-semibold text-xs">Motivo / Nota (opcional)</span>
            </label>
            <input
              v-model="extraModal.notes"
              type="text"
              placeholder="ej. Guardia fin de semana / Taller sábado..."
              class="input input-bordered input-sm w-full"
            />
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-sm btn-ghost" @click="extraModal.open = false">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-sm btn-secondary"
              :disabled="!extraModal.assigned_user_id || !extraModal.shift_date || submittingExtra"
            >
              <span v-if="submittingExtra" class="loading loading-spinner loading-xs"></span>
              <span>Guardar Turno</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="extraModal.open = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- ===================================================== -->
    <!-- MODAL: SOLICITAR COBERTURA O INTERCAMBIO DE TURNO     -->
    <!-- ===================================================== -->
    <dialog class="modal" :class="{ 'modal-open': swapModal.open }">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span>🔄 Cubrir o Intercambiar Turno de Café</span>
        </h3>

        <div v-if="swapModal.shift" class="mt-3 space-y-4">
          <div class="bg-base-200 p-3 rounded-xl text-sm">
            <div>
              Turno seleccionado:
              <strong>{{ swapModal.shift.day_name }} {{ formatDateHuman(swapModal.shift.shift_date) }}</strong>
            </div>
            <div class="text-xs text-base-content/85">
              Encargado actual: <strong>{{ swapModal.shift.assigned_user_name }}</strong>
            </div>
          </div>

          <!-- Mode Selector -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-semibold text-xs uppercase">Tipo de cambio</span>
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                class="border rounded-xl p-3 cursor-pointer flex items-start gap-2 transition-all"
                :class="swapModal.type === 'cover' ? 'border-primary bg-primary/10' : 'border-base-300'"
              >
                <input v-model="swapModal.type" type="radio" value="cover" class="radio radio-primary radio-sm mt-0.5" />
                <div class="text-xs">
                  <div class="font-bold">Un compañero me cubre</div>
                  <div class="text-base-content/85">El sistema compensa el conteo de turnos en las siguientes semanas.</div>
                </div>
              </label>

              <label
                class="border rounded-xl p-3 cursor-pointer flex items-start gap-2 transition-all"
                :class="swapModal.type === 'swap' ? 'border-primary bg-primary/10' : 'border-base-300'"
              >
                <input v-model="swapModal.type" type="radio" value="swap" class="radio radio-primary radio-sm mt-0.5" />
                <div class="text-xs">
                  <div class="font-bold">Trueque de días</div>
                  <div class="text-base-content/85">Cambiar mi día por el día asignado a otro compañero esta semana.</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Select Teammate -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">Selecciona al compañero</span>
            </label>
            <select v-model="swapModal.targetUserId" class="select select-bordered w-full">
              <option :value="0" disabled>-- Elige un integrante --</option>
              <option
                v-for="u in eligibleSwapUsers"
                :key="u.id"
                :value="u.id"
              >
                {{ u.display_name }} (@{{ u.username }}) — Carga efectiva: {{ u.effective_load }}
              </option>
            </select>
          </div>

          <!-- If type === 'swap', select which shift of targetUser to swap with -->
          <div v-if="swapModal.type === 'swap'" class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">Turno del compañero para intercambiar</span>
            </label>
            <select v-model="swapModal.targetShiftId" class="select select-bordered w-full">
              <option :value="0" disabled>-- Selecciona el día del compañero --</option>
              <option
                v-for="ts in targetUserShiftsInWeek"
                :key="ts.id"
                :value="ts.id"
              >
                {{ ts.day_name }} {{ formatDateHuman(ts.shift_date) }} ({{ ts.assigned_user_name }})
              </option>
            </select>
            <p v-if="swapModal.targetUserId && targetUserShiftsInWeek.length === 0" class="text-xs text-warning mt-1">
              Este compañero no tiene otro día asignado en esta misma semana. Usa la opción "Un compañero me cubre" para que el sistema lo compense la próxima semana.
            </p>
          </div>

          <!-- Reason -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-sm">Motivo o nota (opcional)</span>
            </label>
            <input
              v-model="swapModal.reason"
              type="text"
              placeholder="ej. Trabajo remoto ese día / cita médica..."
              class="input input-bordered input-sm w-full"
            />
          </div>

          <!-- Admin Direct Override Checkbox -->
          <div v-if="isAdmin" class="form-control bg-warning/15 border border-warning/30 p-3 rounded-xl">
            <label class="label cursor-pointer justify-start gap-3 py-0">
              <input
                v-model="swapModal.forceByAdmin"
                type="checkbox"
                class="checkbox checkbox-warning checkbox-sm"
              />
              <span class="label-text text-xs font-medium">
                ⚡ Aplicar cambio inmediatamente como Administrador (sin esperar confirmación de la otra parte)
              </span>
            </label>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" @click="swapModal.open = false">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="!swapModal.targetUserId || (swapModal.type === 'swap' && !swapModal.targetShiftId) || submittingSwap"
            @click="submitSwapRequest"
          >
            <span v-if="submittingSwap" class="loading loading-spinner loading-xs"></span>
            <span>{{ swapModal.forceByAdmin ? 'Aplicar Cambio Ahora' : 'Enviar Solicitud' }}</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="swapModal.open = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- ===================================================== -->
    <!-- MODAL: PERSONALIZAR AVATAR BORING AVATARS             -->
    <!-- ===================================================== -->
    <dialog class="modal" :class="{ 'modal-open': avatarModal.open }">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span>🎨</span>
          <span>Personalizar mi Boring Avatar</span>
        </h3>
        <p class="text-xs text-base-content/80 mt-1">
          Elige tu combinación de 5 colores y estilo favorito para tu avatar en Sede Café.
        </p>

        <!-- Preview Card -->
        <div class="my-4 p-4 rounded-2xl bg-base-200 flex items-center justify-between gap-4 border border-base-300">
          <div class="flex items-center gap-3">
            <UserAvatar
              :name="currentUser?.display_name || 'Usuario'"
              :size="64"
              :variant="avatarModal.variant"
              :colors="avatarModal.colors"
            />
            <div>
              <div class="font-bold text-base">{{ currentUser?.display_name }}</div>
              <div class="text-xs text-base-content/70">@{{ currentUser?.username }}</div>
              <div class="text-xs badge badge-primary badge-outline mt-1 capitalize font-medium">
                Estilo: {{ avatarModal.variant }}
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-ghost gap-1 text-xs"
            title="Generar paleta de colores aleatoria"
            @click="randomizePalette"
          >
            <span>🎲</span>
            <span>Aleatorio</span>
          </button>
        </div>

        <!-- Variant Selector -->
        <div class="mb-4">
          <label class="label py-1">
            <span class="label-text text-xs font-bold uppercase tracking-wider text-base-content/70">
              Estilo de Avatar
            </span>
          </label>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <button
              v-for="v in avatarVariants"
              :key="v.id"
              type="button"
              class="btn btn-sm text-xs capitalize flex flex-col h-auto py-2"
              :class="avatarModal.variant === v.id ? 'btn-primary' : 'btn-outline border-base-300'"
              @click="avatarModal.variant = v.id"
            >
              <UserAvatar :name="currentUser?.display_name || 'U'" :size="24" :variant="v.id" :colors="avatarModal.colors" />
              <span>{{ v.name }}</span>
            </button>
          </div>
        </div>

        <!-- Paletas Predefinidas -->
        <div class="mb-4">
          <label class="label py-1">
            <span class="label-text text-xs font-bold uppercase tracking-wider text-base-content/70">
              Paletas Recomendadas
            </span>
          </label>
          <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            <button
              v-for="p in presetPalettes"
              :key="p.name"
              type="button"
              class="flex items-center justify-between p-2 rounded-xl border text-left transition-all hover:border-primary"
              :class="isPaletteSelected(p.colors) ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-base-300 bg-base-100'"
              @click="selectPresetPalette(p.colors)"
            >
              <span class="text-xs font-medium truncate mr-2">{{ p.name }}</span>
              <div class="flex shrink-0 -space-x-1">
                <span
                  v-for="(c, i) in p.colors"
                  :key="i"
                  class="w-4 h-4 rounded-full border border-base-100 shadow-xs"
                  :style="{ backgroundColor: c }"
                ></span>
              </div>
            </button>
          </div>
        </div>

        <!-- Edición Individual de los 5 Colores -->
        <div class="mb-2">
          <label class="label py-1">
            <span class="label-text text-xs font-bold uppercase tracking-wider text-base-content/70">
              Editar Colores de la Paleta (5)
            </span>
          </label>
          <div class="grid grid-cols-5 gap-2">
            <div
              v-for="(col, idx) in avatarModal.colors"
              :key="idx"
              class="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-base-200 border border-base-300"
            >
              <input
                type="color"
                v-model="avatarModal.colors[idx]"
                class="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              />
              <span class="text-[10px] font-mono text-base-content/70 uppercase">
                {{ avatarModal.colors[idx] }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" @click="avatarModal.open = false">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary gap-1"
            :disabled="savingAvatar"
            @click="saveAvatarCustomization"
          >
            <span v-if="savingAvatar" class="loading loading-spinner loading-xs"></span>
            <span>Guardar Avatar</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="avatarModal.open = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- ===================================================== -->
    <!-- MODAL: CAMBIAR MI PIN / RESETEAR PIN                  -->
    <!-- ===================================================== -->
    <dialog class="modal" :class="{ 'modal-open': pinModal.open }">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg">
          {{ pinModal.targetUser ? `🔑 Nuevo PIN para ${pinModal.targetUser.display_name}` : '🔑 Cambiar mi PIN' }}
        </h3>
        <div class="space-y-3 mt-4">
          <div v-if="!pinModal.targetUser" class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs font-semibold">PIN Actual</span>
            </label>
            <input
              v-model="pinModal.currentPin"
              type="password"
              class="input input-bordered input-sm"
              placeholder="••••"
            />
          </div>
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs font-semibold">Nuevo PIN / Contraseña (mín. 4 caracteres)</span>
            </label>
            <input
              v-model="pinModal.newPin"
              type="password"
              class="input input-bordered input-sm"
              placeholder="••••"
            />
          </div>
        </div>
        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" @click="pinModal.open = false">Cancelar</button>
          <button type="button" class="btn btn-sm btn-primary" @click="savePinChange">Guardar PIN</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const theme = useState<string>('sede_cafe_theme', () => 'cupcake')

const activeTab = ref<'schedule' | 'swaps' | 'equity' | 'users'>('schedule')
const feedbackMsg = ref('')
const feedbackType = ref<'success' | 'error'>('success')

// PWA Push Notifications
const {
  isSupported: pushSupported,
  isSubscribed,
  loading: pushLoading,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
  sendTest: sendTestPush
} = usePushNotifications()

async function handleEnablePush() {
  const success = await subscribePush()
  if (success) {
    showFeedback('¡Notificaciones Push activadas en este dispositivo! 🔔')
  } else {
    showFeedback('No se pudo activar las notificaciones. Verifica que tu navegador permita notificaciones.', 'error')
  }
}

async function handleDisablePush() {
  await unsubscribePush()
  showFeedback('Notificaciones desactivadas en este dispositivo.')
}

async function handleTestPush() {
  try {
    const res: any = await sendTestPush()
    showFeedback(res.message || 'Notificación de prueba enviada.')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al enviar notificación de prueba.', 'error')
  }
}

// Reminder Settings & Manual Push
const reminderSettings = reactive({
  config: {
    reminder_enabled: true,
    reminder_time: '08:30',
    reminder_title: '☕ ¡Hoy te toca hacer el café!',
    reminder_message: 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.',
    notify_day_before: false,
    day_before_time: '17:00',
    timezone: 'America/Caracas'
  },
  today: null as any,
  tomorrow: null as any
})
const savingReminders = ref(false)
const sendingReminderNow = ref(false)

async function fetchReminderSettings() {
  try {
    const data: any = await $fetch('/api/settings/reminder')
    if (data?.config) {
      Object.assign(reminderSettings.config, data.config)
    }
    reminderSettings.today = data?.today || null
    reminderSettings.tomorrow = data?.tomorrow || null
  } catch (e) {
    // ignore
  }
}

onMounted(() => {
  if (isAdmin.value) {
    fetchReminderSettings()
  }
})

async function handleSaveReminderSettings() {
  savingReminders.value = true
  try {
    await $fetch('/api/settings/reminder', {
      method: 'PUT',
      body: { ...reminderSettings.config }
    })
    showFeedback('Configuración de recordatorios guardada con éxito.')
    await fetchReminderSettings()
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al guardar la configuración.', 'error')
  } finally {
    savingReminders.value = false
  }
}

async function handleSendReminderNow(target: 'today' | 'tomorrow') {
  sendingReminderNow.value = true
  try {
    const res: any = await $fetch('/api/settings/reminder/send-now', {
      method: 'POST',
      body: { target }
    })
    showFeedback(res.message || 'Recordatorio enviado.')
    await fetchReminderSettings()
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al enviar recordatorio.', 'error')
  } finally {
    sendingReminderNow.value = false
  }
}

function showFeedback(msg: string, type: 'success' | 'error' = 'success') {
  feedbackMsg.value = msg
  feedbackType.value = type
  setTimeout(() => {
    if (feedbackMsg.value === msg) feedbackMsg.value = ''
  }, 5000)
}

function toggleTheme() {
  theme.value = theme.value === 'coffee' ? 'cupcake' : 'coffee'
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem('sede_cafe_theme', theme.value)
  }
}

// 1. Auth Check
const { data: authData, refresh: refreshAuth } = await useFetch('/api/auth/me')
if (!authData.value?.user) {
  await navigateTo('/login')
}

const currentUser = computed(() => authData.value?.user || null)
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 2. Weeks & Shifts State
const selectedWeekStart = ref<string | undefined>(undefined)
const { data: weekData, refresh: refreshWeek } = await useFetch('/api/weeks', {
  query: computed(() => ({
    week_start: selectedWeekStart.value
  }))
})

const regularShifts = computed(() =>
  (weekData.value?.shifts || []).filter((s: any) => !s.is_extraordinary)
)

const extraordinaryShifts = computed(() =>
  (weekData.value?.shifts || []).filter((s: any) => s.is_extraordinary)
)

// Active coffee teammates (including Admin)
const activeTeammates = computed(() =>
  (weekData.value?.equityStats || []).filter((u: any) => u.participates_in_coffee)
)

// 3. Swaps State
const { data: swapsData, refresh: refreshSwaps } = await useFetch('/api/swaps')
const swapsList = computed(() => swapsData.value?.swaps || [])
const pendingSwaps = computed(() => swapsList.value.filter((s: any) => s.status === 'pending'))
const myIncomingPendingSwaps = computed(() =>
  pendingSwaps.value.filter((s: any) => s.target_user_id === currentUser.value?.id)
)
const actionableSwapsCount = computed(() => {
  if (isAdmin.value) return pendingSwaps.value.length
  return myIncomingPendingSwaps.value.length
})

const minActiveLoad = computed(() => {
  if (!activeTeammates.value.length) return 0
  return Math.min(...activeTeammates.value.map((u: any) => u.effective_load))
})

function getPendingSwapForShift(shiftId: number) {
  return pendingSwaps.value.find((s: any) => s.shift_id === shiftId)
}

function selectWeek(mondayStr?: string) {
  if (!mondayStr) return
  selectedWeekStart.value = mondayStr
}

function onSelectWeekDropdown(event: Event) {
  const val = (event.target as HTMLSelectElement).value
  if (val) selectedWeekStart.value = val
}

// Generate or Regenerate Week (Admin)
const generatingWeek = ref(false)
async function handleGenerateWeek(regenerate = false) {
  if (!weekData.value?.selectedWeekMonday) return
  generatingWeek.value = true
  try {
    await $fetch('/api/weeks/generate', {
      method: 'POST',
      body: {
        week_start: weekData.value.selectedWeekMonday,
        regenerate
      }
    })
    await Promise.all([refreshWeek(), refreshSwaps()])
    showFeedback(
      regenerate
        ? 'Semana regenerada equitativamente con éxito.'
        : 'Semana generada equitativamente con éxito.'
    )
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al generar la semana.', 'error')
  } finally {
    generatingWeek.value = false
  }
}

// Extraordinary Shift Modal & Handlers
const extraModal = reactive({
  open: false,
  shift_date: '',
  assigned_user_id: 0,
  notes: ''
})
const submittingExtra = ref(false)

function openExtraordinaryModal() {
  const monday = weekData.value?.selectedWeekMonday || new Date().toISOString().slice(0, 10)
  // Default to Saturday of that week (Monday + 5 days)
  extraModal.shift_date = addDays(monday, 5)
  extraModal.assigned_user_id = 0
  extraModal.notes = 'Turno extraordinario'
  extraModal.open = true
}

async function submitExtraordinaryShift() {
  if (!extraModal.shift_date || !extraModal.assigned_user_id) return
  submittingExtra.value = true
  try {
    await $fetch('/api/shifts/extraordinary', {
      method: 'POST',
      body: {
        shift_date: extraModal.shift_date,
        assigned_user_id: extraModal.assigned_user_id,
        notes: extraModal.notes
      }
    })
    extraModal.open = false
    await refreshWeek()
    showFeedback('Turno extraordinario asignado correctamente.')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo asignar el turno extraordinario.', 'error')
  } finally {
    submittingExtra.value = false
  }
}

async function deleteExtraordinaryShift(shift: any) {
  if (!confirm(`¿Eliminar el turno extraordinario del ${shift.day_name} ${formatDateHuman(shift.shift_date)}?`)) {
    return
  }
  try {
    await $fetch(`/api/shifts/${shift.id}`, {
      method: 'DELETE'
    })
    await refreshWeek()
    showFeedback('Turno extraordinario eliminado.')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo eliminar el turno.', 'error')
  }
}

// Shift status updates
async function toggleShiftCompleted(shift: any) {
  const nextStatus = shift.status === 'completed' ? 'pending' : 'completed'
  try {
    await $fetch(`/api/shifts/${shift.id}`, {
      method: 'PUT',
      body: { status: nextStatus }
    })
    await refreshWeek()
    showFeedback(nextStatus === 'completed' ? '¡Café marcado como listo! ☕' : 'Turno marcado como pendiente.')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo actualizar el turno.', 'error')
  }
}

async function toggleShiftSkipped(shift: any) {
  const nextStatus = shift.status === 'skipped' ? 'pending' : 'skipped'
  try {
    await $fetch(`/api/shifts/${shift.id}`, {
      method: 'PUT',
      body: { status: nextStatus }
    })
    await refreshWeek()
    showFeedback(
      nextStatus === 'skipped'
        ? 'Día marcado como no laborable (no suma carga de turno).'
        : 'Día reactivado.'
    )
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo actualizar el turno.', 'error')
  }
}

// Swap / Cover Modal
const swapModal = reactive({
  open: false,
  shift: null as any,
  type: 'cover' as 'cover' | 'swap',
  targetUserId: 0,
  targetShiftId: 0,
  reason: '',
  forceByAdmin: false
})
const submittingSwap = ref(false)

const eligibleSwapUsers = computed(() => {
  if (!swapModal.shift) return []
  return activeTeammates.value.filter(
    (u: any) => u.id !== swapModal.shift.assigned_user_id
  )
})

const targetUserShiftsInWeek = computed(() => {
  if (!swapModal.targetUserId || !weekData.value?.shifts) return []
  return weekData.value.shifts.filter(
    (s: any) => s.assigned_user_id === swapModal.targetUserId && s.status === 'pending'
  )
})

function openSwapModal(shift: any) {
  swapModal.shift = shift
  swapModal.type = 'cover'
  swapModal.targetUserId = 0
  swapModal.targetShiftId = 0
  swapModal.reason = ''
  swapModal.forceByAdmin = false
  swapModal.open = true
}

async function submitSwapRequest() {
  if (!swapModal.shift || !swapModal.targetUserId) return
  submittingSwap.value = true
  try {
    const res: any = await $fetch('/api/swaps', {
      method: 'POST',
      body: {
        shift_id: swapModal.shift.id,
        target_user_id: swapModal.targetUserId,
        type: swapModal.type,
        target_shift_id: swapModal.type === 'swap' ? swapModal.targetShiftId : null,
        reason: swapModal.reason,
        force_by_admin: swapModal.forceByAdmin
      }
    })
    swapModal.open = false
    await Promise.all([refreshWeek(), refreshSwaps()])
    if (res.status === 'admin_forced') {
      showFeedback('Cambio de turno aplicado directamente por Administrador.')
    } else {
      showFeedback('Solicitud enviada. Se aplicará cuando el compañero acepte o un Admin la apruebe.')
    }
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al solicitar el cambio.', 'error')
  } finally {
    submittingSwap.value = false
  }
}

async function respondSwap(swapId: number, action: 'accept' | 'reject' | 'cancel') {
  try {
    await $fetch(`/api/swaps/${swapId}`, {
      method: 'PUT',
      body: { action }
    })
    await Promise.all([refreshWeek(), refreshSwaps()])
    const msgMap = {
      accept: '¡Intercambio/cobertura aprobado! El calendario y el conteo han sido actualizados.',
      reject: 'Solicitud rechazada.',
      cancel: 'Solicitud cancelada.'
    }
    showFeedback(msgMap[action])
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo procesar la solicitud.', 'error')
  }
}

// Users Management (Admin)
const newUserForm = reactive({
  display_name: '',
  username: '',
  pin: '1234',
  role: 'user' as 'user' | 'admin',
  participates_in_coffee: true
})
const savingUser = ref(false)

async function handleCreateUser() {
  savingUser.value = true
  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: { ...newUserForm }
    })
    newUserForm.display_name = ''
    newUserForm.username = ''
    newUserForm.pin = '1234'
    newUserForm.role = 'user'
    newUserForm.participates_in_coffee = true
    await refreshWeek()
    showFeedback('Usuario creado correctamente.')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al crear usuario.', 'error')
  } finally {
    savingUser.value = false
  }
}

async function updateUserRole(user: any, newRole: string) {
  try {
    await $fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      body: { role: newRole }
    })
    await Promise.all([refreshWeek(), refreshAuth()])
    showFeedback(`Rol de ${user.display_name} actualizado a ${newRole === 'admin' ? 'Admin' : 'Usuario'}.`)
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo cambiar el rol.', 'error')
    await refreshWeek()
  }
}

async function toggleUserCoffeeParticipation(user: any) {
  try {
    await $fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      body: { participates_in_coffee: !user.participates_in_coffee }
    })
    await refreshWeek()
    showFeedback(`Participación en café de ${user.display_name} actualizada.`)
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al actualizar usuario.', 'error')
  }
}

async function deleteUser(user: any) {
  try {
    await $fetch(`/api/users/${user.id}`, {
      method: 'DELETE'
    })
    await refreshWeek()
    showFeedback(`Usuario ${user.display_name} eliminado.`)
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'No se pudo eliminar el usuario.', 'error')
  }
}

// Avatar Customization Modal
const avatarModal = reactive({
  open: false,
  variant: 'beam',
  colors: ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
})
const savingAvatar = ref(false)

const avatarVariants = [
  { id: 'beam', name: 'Beam' },
  { id: 'marble', name: 'Marble' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'bauhaus', name: 'Bauhaus' },
  { id: 'pixel', name: 'Pixel' },
  { id: 'ring', name: 'Ring' }
]

const presetPalettes = [
  { name: '☕ Café Clásico', colors: ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887'] },
  { name: '🍫 Espresso Intenso', colors: ['#211510', '#3b2219', '#633827', '#8c533e', '#cba382'] },
  { name: '🧁 Capuchino Canela', colors: ['#7f4f24', '#936639', '#a68a64', '#b6ad90', '#c2c5aa'] },
  { name: '🌅 Atardecer Cálido', colors: ['#e06d53', '#f29e4c', '#efea5a', '#3f88c5', '#032b43'] },
  { name: '🌊 Océano Profundo', colors: ['#0d3b66', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { name: '🌲 Bosque Esmeralda', colors: ['#283618', '#606c38', '#dda15e', '#bc6c25', '#588157'] },
  { name: '🍓 Frutos Rojos', colors: ['#590d22', '#800f2f', '#a4133c', '#c9184a', '#ff758f'] },
  { name: '⚡ Neón Cyber', colors: ['#ff007f', '#7928ca', '#00f0ff', '#4ade80', '#facc15'] },
  { name: '🌸 Pastel Nórdico', colors: ['#9c89b8', '#f0a6ca', '#efc3e6', '#f0e6ef', '#b8bedd'] },
  { name: '🌿 Tierra y Menta', colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] }
]

function isPaletteSelected(colors: string[]) {
  if (!avatarModal.colors || avatarModal.colors.length !== colors.length) return false
  return colors.every((c, i) => c.toLowerCase() === avatarModal.colors[i]?.toLowerCase())
}

function selectPresetPalette(colors: string[]) {
  avatarModal.colors = [...colors]
}

function randomizePalette() {
  const letters = '0123456789abcdef'
  avatarModal.colors = Array.from({ length: 5 }, () => {
    let col = '#'
    for (let i = 0; i < 6; i++) {
      col += letters[Math.floor(Math.random() * 16)]
    }
    return col
  })
}

function openAvatarModal() {
  const user = currentUser.value as any
  if (user) {
    avatarModal.variant = user.avatar_variant || 'beam'
    if (user.avatar_palette && Array.isArray(user.avatar_palette) && user.avatar_palette.length === 5) {
      avatarModal.colors = [...user.avatar_palette]
    } else {
      avatarModal.colors = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    }
  }
  avatarModal.open = true
}

async function saveAvatarCustomization() {
  savingAvatar.value = true
  try {
    const res = await $fetch<{ ok: boolean; avatar_palette: string[]; avatar_variant: string }>('/api/users/avatar', {
      method: 'PUT',
      body: {
        colors: avatarModal.colors,
        variant: avatarModal.variant
      }
    })
    if (currentUser.value) {
      currentUser.value.avatar_palette = res.avatar_palette
      currentUser.value.avatar_variant = res.avatar_variant
    }
    await Promise.all([refreshWeek(), refreshAuth()])
    avatarModal.open = false
    showFeedback('¡Tu avatar y paleta de colores se guardaron correctamente! 🎨')
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al guardar los colores del avatar.', 'error')
  } finally {
    savingAvatar.value = false
  }
}

// PIN Modal
const pinModal = reactive({
  open: false,
  targetUser: null as any,
  currentPin: '',
  newPin: ''
})

function openPinModal() {
  pinModal.targetUser = null
  pinModal.currentPin = ''
  pinModal.newPin = ''
  pinModal.open = true
}

function openResetUserPinModal(user: any) {
  pinModal.targetUser = user
  pinModal.currentPin = ''
  pinModal.newPin = ''
  pinModal.open = true
}

async function savePinChange() {
  try {
    if (pinModal.targetUser) {
      await $fetch(`/api/users/${pinModal.targetUser.id}`, {
        method: 'PUT',
        body: { pin: pinModal.newPin }
      })
      showFeedback(`PIN de ${pinModal.targetUser.display_name} actualizado.`)
    } else {
      await $fetch('/api/auth/pin', {
        method: 'PUT',
        body: {
          currentPin: pinModal.currentPin,
          newPin: pinModal.newPin
        }
      })
      showFeedback('Tu PIN ha sido actualizado.')
    }
    pinModal.open = false
  } catch (err: any) {
    showFeedback(err?.data?.statusMessage || 'Error al actualizar el PIN.', 'error')
  }
}

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await router.push('/login')
}

// Date Helpers with dayjs
import dayjs from 'dayjs'
import 'dayjs/locale/es.js'
dayjs.locale('es')

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const todayCaracas = dayjs().tz('America/Caracas').format('YYYY-MM-DD')
  return dateStr === todayCaracas
}

function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('DD/MM/YYYY')
}

function formatDateHuman(dateStr?: string | null): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('D [de] MMM')
}

function addDays(dateStr: string, days: number): string {
  return dayjs(dateStr).add(days, 'day').format('YYYY-MM-DD')
}
</script>
