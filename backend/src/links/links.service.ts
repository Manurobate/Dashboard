import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LinkEntity } from './link.entity';
import { LinkCategoryEntity } from './link-category.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    @InjectRepository(LinkEntity)
    private readonly repo: Repository<LinkEntity>,
    @InjectRepository(LinkCategoryEntity)
    private readonly categoryRepo: Repository<LinkCategoryEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: number): Promise<LinkEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { categoryId: 'ASC', position: 'ASC' },
    });
  }

  async create(userId: number, dto: CreateLinkDto): Promise<LinkEntity> {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new ForbiddenException(`Catégorie ${dto.categoryId} introuvable`);

    const maxResult = await this.repo
      .createQueryBuilder('link')
      .select('MAX(link.position)', 'max')
      .where('link.categoryId = :categoryId AND link.userId = :userId', {
        categoryId: dto.categoryId,
        userId,
      })
      .getRawOne<{ max: string | number | null }>();

    const position = Number(maxResult?.max ?? -1) + 1;
    const link = this.repo.create({ ...dto, userId, position });
    return this.repo.save(link);
  }

  async update(userId: number, id: number, dto: UpdateLinkDto): Promise<LinkEntity> {
    const link = await this.repo.findOne({ where: { id, userId } });
    if (!link) throw new NotFoundException(`Lien ${id} introuvable`);
    Object.assign(link, dto);
    return this.repo.save(link);
  }

  async remove(userId: number, id: number): Promise<void> {
    const link = await this.repo.findOne({ where: { id, userId } });
    if (!link) throw new NotFoundException(`Lien ${id} introuvable`);
    await this.repo.remove(link);
    this.logger.log(`Lien ${id} supprimé pour userId=${userId}`);
  }

  async reorder(userId: number, items: { id: number; position: number }[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        const result = await manager.update(LinkEntity, { id: item.id, userId }, { position: item.position });
        if (result.affected === 0) {
          throw new NotFoundException(`Lien ${item.id} introuvable`);
        }
      }
    });
  }
}
