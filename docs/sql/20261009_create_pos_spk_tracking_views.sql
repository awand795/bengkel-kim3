-- ==============================================================================
-- Migration / Views: sch_fleet.v_spk_pos_service, v_spk_pos_item_pekerjaan, v_spk_pos_item_part
-- Date: 2026-10-09
-- Description:
--   Cross-schema views in sch_fleet reading real-time Work Order, SPK, and
--   billing data directly from sch_pos for future production integration
--   via API Builder without disrupting the current demo dummy view.
-- ==============================================================================

-- 1. Main SPK / Tracking View
CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_service AS
SELECT 
    wo.id AS id,
    COALESCE(rs.logisticnotransspk, wo.wono) AS no_spk,
    wo.wono AS no_wo,
    wo.id AS id_antrian,
    rs.id AS id_booking,
    mu.policeno AS no_polisi,
    COALESCE(m.membername, wo.drivername, 'Customer Fleet') AS nama_customer,
    m.member_fleet_id AS id_pelanggan,
    COALESCE(wo.vehicle_km, 0)::integer AS odometer_km,
    NULL::text AS foto_odometer,
    COALESCE(wo.jobtype, rs.jobtype, 'Service Kendaraan') AS keluhan_customer,
    
    -- Kondisi Fisik Awal dari tbl_wo_check
    COALESCE((SELECT CASE WHEN c.value = 1 THEN 'OK' WHEN c.value = 2 THEN 'Perlu Perhatian' WHEN c.value = 3 THEN 'Rusak' ELSE 'OK' END 
              FROM sch_pos.tbl_wo_check c WHERE c.woid = wo.id AND c.checkid = 1 LIMIT 1), 'OK') AS cek_body,
    COALESCE((SELECT CASE WHEN c.value = 1 THEN 'OK' WHEN c.value = 2 THEN 'Perlu Perhatian' WHEN c.value = 3 THEN 'Rusak' ELSE 'OK' END 
              FROM sch_pos.tbl_wo_check c WHERE c.woid = wo.id AND c.checkid = 2 LIMIT 1), 'OK') AS cek_mesin,
    COALESCE((SELECT CASE WHEN c.value = 1 THEN 'OK' WHEN c.value = 2 THEN 'Perlu Perhatian' WHEN c.value = 3 THEN 'Rusak' ELSE 'OK' END 
              FROM sch_pos.tbl_wo_check c WHERE c.woid = wo.id AND c.checkid = 3 LIMIT 1), 'OK') AS cek_kelistrikan,
    COALESCE((SELECT CASE WHEN c.value = 1 THEN 'OK' WHEN c.value = 2 THEN 'Perlu Perhatian' WHEN c.value = 3 THEN 'Rusak' ELSE 'OK' END 
              FROM sch_pos.tbl_wo_check c WHERE c.woid = wo.id AND c.checkid = 4 LIMIT 1), 'OK') AS cek_kaki_kaki,
              
    COALESCE(mu.note, wo.void_memo) AS catatan_kondisi_awal,
    COALESCE(sa.employeename, wo.serviceadvisorcode, 'Service Advisor') AS nama_sa,
    'Foreman Bengkel'::character varying AS nama_foreman,
    COALESCE(mek.employeename, wo.employeecode, 'Teknisi KIM3') AS nama_mekanik,
    
    -- Status SPK Real-time
    CASE 
        WHEN p.id IS NOT NULL OR wo.status = 'C' THEN 'Selesai'
        WHEN wo.testdrivedatefir IS NOT NULL THEN 'QC Passed'
        WHEN wo.servicefinishat IS NOT NULL THEN 'Selesai Dikerjakan'
        WHEN wo.servicestartat IS NOT NULL THEN 'Proses Pekerjaan'
        WHEN wo.timein IS NOT NULL THEN 'Check In'
        ELSE 'Menunggu'
    END AS status_spk,
    
    -- Estimasi & Nilai Transaksi
    COALESCE(p.total::numeric, (SELECT SUM(totalprice) FROM sch_pos.tbl_wo_product wp WHERE wp.woid = wo.id), 0.00) AS estimasi_biaya,
    GREATEST(1, COALESCE(EXTRACT(EPOCH FROM (wo.servicefinishat - wo.servicestartat))/3600, 1))::integer AS estimasi_waktu_jam,
    
    -- Timeline Milestones
    wo.timein AS waktu_check_in,
    wo.servicestartat AS waktu_mulai_pekerjaan,
    wo.servicefinishat AS waktu_selesai_pekerjaan,
    NULL::timestamp with time zone AS waktu_waiting_part,
    NULL::timestamp with time zone AS waktu_part_ready,
    wo.testdrivedatefir AS waktu_qc,
    wo.testdrivedatefir AS waktu_fir_closed,
    CASE WHEN p.id IS NOT NULL THEN (p.transdate + p.transtime)::timestamp with time zone ELSE NULL END AS waktu_invoice,
    COALESCE(p.finish_date, (p.transdate + p.transtime), wo.testdrivedatefir, wo.servicefinishat) AS waktu_check_out,
    
    -- Lead Time
    ROUND(COALESCE(EXTRACT(EPOCH FROM (COALESCE(p.finish_date, (p.transdate + p.transtime), wo.servicefinishat, CURRENT_TIMESTAMP) - wo.timein))/3600, 1)::numeric, 2) AS lead_time_jam,
    
    -- Catatan SA & QC
    COALESCE(wo.void_memo, '[Final Check SA]: Pemeriksaan fisik dan hasil pengerjaan kendaraan disetujui.') AS catatan_sa,
    CASE 
        WHEN wo.testdrivedatefir IS NOT NULL THEN 'QC PASSED: Uji kendaraan dan inspeksi foreman memenuhi standar.'
        ELSE NULL 
    END AS catatan_foreman,
    
    -- Invoice Data dari tbl_pos
    p.transno AS no_invoice,
    p.total AS total_invoice,
    p.status AS status_invoice,
    p.paid AS total_bayar,
    
    -- Foto Fisik Kendaraan
    f.foto_data AS foto_kendaraan,
    NULL::text AS foto_stnk,
    NULL::text AS foto_kir,
    
    -- Audit Timestamps
    wo.createdat AS created_at,
    wo.createdby AS input_by,
    wo.createdat AS input_date,
    wo.updatedby AS update_by,
    wo.updatedat AS update_dt
FROM sch_pos.tbl_wo wo
LEFT JOIN sch_pos.tbl_member m ON wo.memberid = m.id
LEFT JOIN sch_pos.tbl_member_unit mu ON wo.policenoid = mu.id
LEFT JOIN sch_pos.tbl_employee sa ON wo.serviceadvisorcode = sa.employeeid
LEFT JOIN sch_pos.tbl_employee mek ON wo.employeecode = mek.employeeid
LEFT JOIN sch_pos.tbl_pos p ON wo.id = p.woid
LEFT JOIN sch_pos.tbl_request_service rs ON wo.norequestservice = rs.norequestservice
LEFT JOIN sch_fleet.foto f ON f.kategori = 'KENDARAAN' AND f.referensi_id = REPLACE(UPPER(mu.policeno), ' ', '');

GRANT SELECT ON sch_fleet.v_spk_pos_service TO postgres;


-- 2. Detail Pekerjaan (Jasa)
CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_item_pekerjaan AS
SELECT 
    wp.woid AS id_spk,
    wp.productcode AS kode_pekerjaan,
    COALESCE(srv.servicename, wp.keterangan, wp.productcode) AS nama_pekerjaan,
    'Jasa'::character varying AS kategori,
    1.00::numeric(5,2) AS estimasi_durasi_jam,
    wp.sellprice AS biaya_jasa,
    COALESCE(mek.employeename, wp.employeecode, 'Teknisi') AS nama_mekanik,
    'Selesai'::character varying AS status_pekerjaan,
    wp.createdat AS waktu_mulai,
    wp.updatedat AS waktu_selesai,
    wp.createdat AS created_at
FROM sch_pos.tbl_wo_product wp
LEFT JOIN sch_pos.tbl_service srv ON wp.productcode = srv.servicecode
LEFT JOIN sch_pos.tbl_employee mek ON wp.employeecode = mek.employeeid
WHERE wp.typecode = 'S';

GRANT SELECT ON sch_fleet.v_spk_pos_item_pekerjaan TO postgres;


-- 3. Detail Suku Cadang (Part)
CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_item_part AS
SELECT 
    wp.woid AS id_spk,
    wp.productcode AS kode_part,
    COALESCE(prd.productname, wp.keterangan, wp.productcode) AS nama_part,
    wp.qty::integer AS jumlah,
    'Pcs'::character varying AS satuan,
    wp.sellprice AS harga_satuan,
    wp.totalprice AS subtotal,
    'Ready di Stock'::character varying AS status_ketersediaan,
    'Terpasang'::character varying AS status_part,
    NULL::timestamp with time zone AS estimasi_barang_ready_eta,
    wp.createdat AS created_at,
    NULL::character varying AS lokasi_rak
FROM sch_pos.tbl_wo_product wp
LEFT JOIN sch_pos.vw_product prd ON wp.productcode = prd.productcode
WHERE wp.typecode = 'P';

GRANT SELECT ON sch_fleet.v_spk_pos_item_part TO postgres;
