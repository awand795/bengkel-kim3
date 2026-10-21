-- ==============================================================================
-- SINKRONISASI BOOKING POS & NOTIFIKASI WEB FLEET CUSTOMER
-- Tabel Sumber: sch_pos.tbl_fleet_booking_service
-- Tabel Target: sch_fleet.booking_service & sch_fleet.notifikasi
-- ==============================================================================

-- 1. Buat / Perbarui View sch_fleet.v_fleet_booking_service
CREATE OR REPLACE VIEW sch_fleet.v_fleet_booking_service AS
SELECT 
    b.id,
    p.id AS pos_booking_id,
    b.no_booking,
    b.id_pelanggan,
    b.no_polisi,
    b.jenis_layanan,
    b.keluhan,
    b.catatan,
    p.status::text AS status_pos,
    p.memo AS memo_pos,
    p.reschedule_date,
    b.tanggal_booking AS tanggal_booking_awal,
    b.jam_booking AS jam_booking_awal,
    CASE 
        WHEN p.status = 'RESCHEDULED' AND p.reschedule_date IS NOT NULL 
        THEN DATE(p.reschedule_date)
        ELSE b.tanggal_booking 
    END AS tanggal_booking,
    CASE 
        WHEN p.status = 'RESCHEDULED' AND p.reschedule_date IS NOT NULL 
        THEN TO_CHAR(p.reschedule_date, 'HH24:MI')
        ELSE b.jam_booking 
    END AS jam_booking,
    CASE 
        WHEN COALESCE(b.is_canceled, false) = true OR p.status = 'CANCELED' THEN 'Dibatalkan'
        WHEN p.status = 'CONFIRMED' THEN 'Confirmed'
        WHEN p.status = 'RESCHEDULED' THEN 'Rescheduled'
        ELSE 'Menunggu Konfirmasi'
    END AS status,
    COALESCE(p.status = 'CONFIRMED', false) AS is_confirmed,
    CASE 
        WHEN p.status = 'CONFIRMED' THEN false
        WHEN COALESCE(b.is_canceled, false) = true OR p.status = 'CANCELED' THEN false
        ELSE true
    END AS can_cancel,
    b.prioritas,
    b.kode_cabang,
    b.nama_cabang,
    (COALESCE(b.is_canceled, false) = true OR p.status = 'CANCELED') AS is_canceled,
    COALESCE(b.cancelat, CASE WHEN p.status = 'CANCELED' THEN p.updated_at ELSE NULL END) AS cancelat,
    COALESCE(b.cancelby, CASE WHEN p.status = 'CANCELED' THEN COALESCE(p.updated_by, 'Admin POS') ELSE NULL END) AS cancelby,
    b.created_at
FROM sch_fleet.booking_service b
LEFT JOIN sch_pos.tbl_fleet_booking_service p 
    ON b.no_booking = p.booking_no OR b.id = p.id;

-- 2. Trigger Function Notifikasi Otomatis
CREATE OR REPLACE FUNCTION sch_pos.fn_sync_fleet_booking_notifications()
RETURNS TRIGGER AS $BODY$
DECLARE
    v_id_pelanggan integer;
    v_no_booking varchar;
    v_no_polisi varchar;
    v_tgl_reschedule text;
BEGIN
    SELECT id_pelanggan, no_booking, no_polisi
    INTO v_id_pelanggan, v_no_booking, v_no_polisi
    FROM sch_fleet.booking_service
    WHERE no_booking = NEW.booking_no OR id = NEW.id
    LIMIT 1;

    IF v_no_booking IS NULL THEN
        v_no_booking := NEW.booking_no;
    END IF;
    IF v_no_polisi IS NULL THEN
        v_no_polisi := NEW.police_no;
    END IF;

    -- 1. Status CONFIRMED: Notifikasi konfirmasi booking
    IF NEW.status = 'CONFIRMED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
        IF v_id_pelanggan IS NOT NULL THEN
            INSERT INTO sch_fleet.notifikasi (title, pesan, link_tab, urgency, id_pengguna)
            VALUES (
                'Booking Dikonfirmasi Admin',
                'Jadwal booking servis Anda (' || v_no_booking || ' - ' || v_no_polisi || ') telah dikonfirmasi oleh Bengkel KIM 3 untuk tanggal ' || TO_CHAR(NEW.booking_date, 'DD/MM/YYYY') || ' jam ' || NEW.booking_time || ' WIB. Unit Anda siap diterima di Pos Gerbang.',
                'fleet-booking',
                'success',
                v_id_pelanggan
            );
        END IF;

    -- 2. Status RESCHEDULED: Notifikasi jadwal di-reschedule
    ELSIF NEW.status = 'RESCHEDULED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.reschedule_date IS DISTINCT FROM NEW.reschedule_date) THEN
        IF NEW.reschedule_date IS NOT NULL THEN
            v_tgl_reschedule := TO_CHAR(NEW.reschedule_date, 'DD/MM/YYYY jam HH24:MI');
        ELSE
            v_tgl_reschedule := TO_CHAR(NEW.booking_date, 'DD/MM/YYYY') || ' jam ' || NEW.booking_time;
        END IF;

        IF v_id_pelanggan IS NOT NULL THEN
            INSERT INTO sch_fleet.notifikasi (title, pesan, link_tab, urgency, id_pengguna)
            VALUES (
                'Jadwal Booking Di-reschedule',
                'Jadwal booking servis Anda (' || v_no_booking || ' - ' || v_no_polisi || ') telah dijadwalkan ulang oleh bengkel menjadi tanggal ' || v_tgl_reschedule || ' WIB.' || CASE WHEN NEW.memo IS NOT NULL AND NEW.memo <> '' THEN ' Catatan: ' || NEW.memo ELSE '' END,
                'fleet-booking',
                'warning',
                v_id_pelanggan
            );
        END IF;

    -- 3. Status CANCELED: Notifikasi dibatalkan oleh pihak bengkel
    ELSIF NEW.status = 'CANCELED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE sch_fleet.booking_service
        SET is_canceled = true,
            status = 'Booking Canceled',
            cancelat = NOW(),
            cancelby = COALESCE(NEW.updated_by, 'Admin POS')
        WHERE no_booking = NEW.booking_no OR id = NEW.id;

        IF v_id_pelanggan IS NOT NULL THEN
            INSERT INTO sch_fleet.notifikasi (title, pesan, link_tab, urgency, id_pengguna)
            VALUES (
                'Booking Dibatalkan Bengkel',
                'Booking servis Anda (' || v_no_booking || ' - ' || v_no_polisi || ') dibatalkan oleh pihak bengkel.' || CASE WHEN NEW.memo IS NOT NULL AND NEW.memo <> '' THEN ' Alasan: ' || NEW.memo ELSE '' END,
                'fleet-booking',
                'urgent',
                v_id_pelanggan
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_fleet_booking_notifications ON sch_pos.tbl_fleet_booking_service;
CREATE TRIGGER trg_sync_fleet_booking_notifications
AFTER INSERT OR UPDATE ON sch_pos.tbl_fleet_booking_service
FOR EACH ROW
EXECUTE FUNCTION sch_pos.fn_sync_fleet_booking_notifications();
