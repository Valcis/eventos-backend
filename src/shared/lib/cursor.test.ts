import { describe, it, expect } from 'vitest';
import { buildAfterFilter } from './cursor';
import { ObjectId } from 'mongodb';

describe('cursor utilities', () => {
	describe('buildAfterFilter', () => {
		it('should build correct filter for ascending sort on createdAt', () => {
			const testDate = new Date('2024-01-15T10:00:00.000Z');
			const cursorDoc = {
				createdAt: testDate,
				_id: new ObjectId('507f1f77bcf86cd799439011'),
			};

			const filter = buildAfterFilter('createdAt', 'asc', cursorDoc);

			expect(filter).toHaveProperty('$or');
			expect(filter.$or).toHaveLength(2);
			expect(filter.$or?.[0]).toHaveProperty('createdAt');
			expect(filter.$or?.[0]?.createdAt).toHaveProperty('$gt');
			expect(filter.$or?.[1]).toHaveProperty('_id');
		});

		it('should build correct filter for descending sort on createdAt', () => {
			const testDate = new Date('2024-01-15T10:00:00.000Z');
			const cursorDoc = {
				createdAt: testDate,
				_id: new ObjectId('507f1f77bcf86cd799439011'),
			};

			const filter = buildAfterFilter('createdAt', 'desc', cursorDoc);

			expect(filter).toHaveProperty('$or');
			expect(filter.$or).toHaveLength(2);
			expect(filter.$or?.[0]).toHaveProperty('createdAt');
			expect(filter.$or?.[0]?.createdAt).toHaveProperty('$lt');
			expect(filter.$or?.[1]).toHaveProperty('_id');
		});

		it('should build correct filter for ascending sort on updatedAt', () => {
			const testDate = new Date('2024-01-15T10:00:00.000Z');
			const cursorDoc = {
				updatedAt: testDate,
				_id: new ObjectId('507f1f77bcf86cd799439011'),
			};

			const filter = buildAfterFilter('updatedAt', 'asc', cursorDoc);

			expect(filter).toHaveProperty('$or');
			expect(filter.$or).toHaveLength(2);
			expect(filter.$or?.[0]).toHaveProperty('updatedAt');
		});

		it('should use $gt operator for ascending sort', () => {
			const testDate = new Date('2024-01-15T10:00:00.000Z');
			const cursorDoc = {
				createdAt: testDate,
				_id: new ObjectId('507f1f77bcf86cd799439011'),
			};

			const filter = buildAfterFilter('createdAt', 'asc', cursorDoc);

			expect(filter.$or?.[0]?.createdAt).toHaveProperty('$gt');
			expect(filter.$or?.[1]?._id).toHaveProperty('$gt');
		});

		it('should use $lt operator for descending sort', () => {
			const testDate = new Date('2024-01-15T10:00:00.000Z');
			const cursorDoc = {
				createdAt: testDate,
				_id: new ObjectId('507f1f77bcf86cd799439011'),
			};

			const filter = buildAfterFilter('createdAt', 'desc', cursorDoc);

			expect(filter.$or?.[0]?.createdAt).toHaveProperty('$lt');
			expect(filter.$or?.[1]?._id).toHaveProperty('$lt');
		});
	});
});
