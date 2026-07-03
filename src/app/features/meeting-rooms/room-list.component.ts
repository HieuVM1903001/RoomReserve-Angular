import { Component, OnInit, signal , inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MeetingRoomService } from '../../core/services/meeting-room.service';
import { MeetingRoom, RoomStatus } from '../../core/models/meeting-room.model';

const EQUIPMENT_OPTIONS = ['Máy chiếu', 'Màn hình TV', 'Bảng viết', 'Micro', 'Camera họp trực tuyến', 'Loa', 'Điều hòa'];

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './room-list.component.html',
})
export class RoomListComponent implements OnInit {
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingRoom = signal<MeetingRoom | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  equipmentOptions = EQUIPMENT_OPTIONS;

  private fb = inject(FormBuilder);

  form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    location: ['', Validators.required],
    capacity: [4, [Validators.required, Validators.min(1)]],
    description: [''],
    status: ['ACTIVE' as RoomStatus, Validators.required],
    equipment: this.fb.array(EQUIPMENT_OPTIONS.map(() => false)),
  });

  constructor(private roomService: MeetingRoomService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  get isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  loadRooms(): void {
    this.loading.set(true);
    this.roomService.getAll().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: RoomStatus): string {
    return { ACTIVE: 'Hoạt động', INACTIVE: 'Tạm ngưng', MAINTENANCE: 'Bảo trì' }[status];
  }

  statusBadgeClass(status: RoomStatus): string {
    return { ACTIVE: 'badge-approved', INACTIVE: 'badge-cancelled', MAINTENANCE: 'badge-pending' }[status];
  }

  openCreate(): void {
    this.editingRoom.set(null);
    this.errorMessage.set(null);
    this.form.reset({ code: '', name: '', location: '', capacity: 4, description: '', status: 'ACTIVE' });
    this.equipmentOptions.forEach((_, i) => this.equipmentArray.at(i).setValue(false));
    this.showModal.set(true);
  }

  openEdit(room: MeetingRoom): void {
    this.editingRoom.set(room);
    this.errorMessage.set(null);
    this.form.patchValue({
      code: room.code,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      description: room.description,
      status: room.status,
    });
    this.equipmentOptions.forEach((eq, i) => this.equipmentArray.at(i).setValue(room.equipment?.includes(eq) ?? false));
    this.showModal.set(true);
  }

  get equipmentArray() {
    return this.form.get('equipment') as any;
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const equipment = this.equipmentOptions.filter((_, i) => value.equipment![i]);
    const payload = {
      code: value.code!,
      name: value.name!,
      location: value.location!,
      capacity: value.capacity!,
      equipment,
      description: value.description || undefined,
      status: value.status as RoomStatus,
    };

    const editing = this.editingRoom();
    const req = editing ? this.roomService.update(editing.id, payload) : this.roomService.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadRooms();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      },
    });
  }

  deleteRoom(room: MeetingRoom): void {
    if (!confirm(`Xóa phòng "${room.name}"?`)) return;
    this.roomService.delete(room.id).subscribe(() => this.loadRooms());
  }
}
