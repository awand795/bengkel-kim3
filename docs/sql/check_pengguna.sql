SELECT id, username, nama_lengkap, id_pelanggan, role 
FROM sch_fleet.pengguna 
WHERE id = 11 OR id_pelanggan = 11 OR id IN (SELECT id_pelanggan FROM sch_fleet.booking_service);
