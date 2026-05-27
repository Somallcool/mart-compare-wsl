package com.martcompare.backend.repository;

import com.martcompare.backend.entity.Mart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MartRepository extends JpaRepository<Mart, Long> {

    @Query(value = """
        SELECT m.*,
            (6371 * acos(cos(radians(:lat)) * cos(radians(m.latitude))
            * cos(radians(m.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(m.latitude)))) AS distance
        FROM mart m
        WHERE m.name = 'CU'
        HAVING distance <= :radius
        ORDER BY distance
        """, nativeQuery = true)
    List<Mart> findNearbyCUs(@Param("lat") double lat, @Param("lng") double lng, @Param("radius") double radius);

    @Query(value = """
        SELECT m.*,
            (6371 * acos(cos(radians(:lat)) * cos(radians(m.latitude))
            * cos(radians(m.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(m.latitude)))) AS distance
        FROM mart m
        HAVING distance <= :radius
        ORDER BY distance
        """, nativeQuery = true)
    List<Mart> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radius") double radius);
}
