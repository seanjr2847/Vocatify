SELECT DISTINCT artist_type, COUNT(*) as count
FROM artists
GROUP BY artist_type
ORDER BY count DESC;
