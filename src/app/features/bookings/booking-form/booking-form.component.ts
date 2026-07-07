import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { MeetingRoomService } from '../../../core/services/meeting-room.service';
import { MeetingRoom } from '../../../core/models/meeting-room.model';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
})
export class BookingFormComponent implements OnInit {
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  bookingId: number | null = null;

  private fb = inject(FormBuilder);

  form = this.fb.group({
    roomId: [null as number | null, Validators.required],
    title: ['', Validators.required],
    description: [''],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    numberOfParticipants: [1, [Validators.required, Validators.min(1)]],
    note: [''],
    participants: this.fb.array([]),
  });

  constructor(
    private bookingService: BookingService,
    private roomService: MeetingRoomService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get isEdit(): boolean {
    return this.bookingId !== null;
  }

  get participants(): FormArray {
    return this.form.get('participants') as FormArray;
  }

  ngOnInit(): void {
    this.roomService.getAll().subscribe((rooms) => this.rooms.set(rooms.filter((r) => r.status === 'ACTIVE')));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.bookingId = Number(idParam);
      this.loading.set(true);
      this.bookingService.getById(this.bookingId).subscribe({
        next: (b) => {
          // Prefill every field with the booking's existing data first...
          this.form.patchValue({
            roomId: b.roomId,
            title: b.title,
            description: b.description,
            startTime: this.toLocalInput(b.startTime),
            endTime: this.toLocalInput(b.endTime),
            numberOfParticipants: b.numberOfParticipants,
            note: b.note,
          });
          this.participants.clear();
          b.participants?.forEach((p) => this.addParticipant(p.fullName, p.email));

          // ...then lock the room field: per spec, the room can't be changed
          // once a booking exists, only title/description/time/participants/note can.
          this.form.get('roomId')?.disable();

          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.addParticipant('', '');
    }
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  addParticipant(fullName = '', email = ''): void {
    this.participants.push(
      this.fb.group({
        fullName: [fullName, Validators.required],
        email: [email, [Validators.required, Validators.email]],
      })
    );
  }

  removeParticipant(index: number): void {
    this.participants.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.errorMessage.set('Vui lòng điền đầy đủ thông tin và đảm bảo dữ liệu hợp lệ.');
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue(); // getRawValue() so the disabled roomId is still included
    const start = new Date(value.startTime!);
    const end = new Date(value.endTime!);

    if (start >= end) {
      this.errorMessage.set('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.');
      return;
    }
    if (start < new Date()) {
      this.errorMessage.set('Không được đặt lịch trong quá khứ.');
      return;
    }

    this.errorMessage.set(null);
    this.saving.set(true);

    const req = this.isEdit
      ? this.bookingService.update(this.bookingId!, {
          title: value.title!,
          description: value.description || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          numberOfParticipants: value.numberOfParticipants!,
          participants: value.participants as any,
          note: value.note || undefined,
        })
      : this.bookingService.create({
          roomId: value.roomId!,
          title: value.title!,
          description: value.description || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          numberOfParticipants: value.numberOfParticipants!,
          participants: value.participants as any,
          note: value.note || undefined,
        });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại thông tin (có thể trùng lịch).');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/bookings']);
  }
}
