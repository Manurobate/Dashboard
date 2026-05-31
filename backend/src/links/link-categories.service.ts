import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { CreateLinkCategoryDto } from './dto/create-link-category.dto';
import { UpdateLinkCategoryDto } from './dto/update-link-category.dto';

@Injectable()
export class LinkCategoriesService {
  private readonly logger = new Logger(LinkCategoriesService.name);

  constructor(
    @InjectRepository(LinkCategoryEntity)
    private readonly repo: Repository<LinkCategoryEntity>,
  ) {}

  findAll(userId: number): Promise<LinkCategoryEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { position: 'ASC' },
    });
  }

  async create(
    userId: number,
    dto: CreateLinkCategoryDto,
  ): Promise<LinkCategoryEntity> {
    const maxResult = await this.repo
      .createQueryBuilder('cat')
      .select('MAX(cat.position)', 'max')
      .where('cat.userId = :userId', { userId })
      .getRawOne<{ max: number | null }>();

    const position = (maxResult?.max ?? -1) + 1;
    const cat = this.repo.create({ ...dto, userId, position });
    return this.repo.save(cat);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateLinkCategoryDto,
  ): Promise<LinkCategoryEntity> {
    const cat = await this.repo.findOne({ where: { id, userId } });
    if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(userId: number, id: number): Promise<void> {
    const cat = await this.repo.findOne({ where: { id, userId } });
    if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);
    await this.repo.remove(cat);
    this.logger.log(`Catégorie ${id} supprimée pour userId=${userId}`);
  }

  async reorder(
    userId: number,
    items: { id: number; position: number }[],
  ): Promise<void> {
    for (const item of items) {
      const result = await this.repo.update(
        { id: item.id, userId },
        { position: item.position },
      );
      if (!result.affected)
        throw new NotFoundException(`Catégorie ${item.id} introuvable`);
    }
  }
}
